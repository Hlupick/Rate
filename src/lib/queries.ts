import { randomBytes, randomUUID } from 'node:crypto'
import { db } from './db'
import type {
  AdminUserRow,
  ArtistSummary,
  Invite,
  Playlist,
  Report,
  Track,
  UserPublic,
  UserRecord,
} from './types'

type Row = Record<string, any>

function mapUser(row: Row): UserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    username: String(row.username),
    displayName: String(row.display_name),
    bio: row.bio ? String(row.bio) : null,
    status: row.status ? String(row.status) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    cover: row.cover ? String(row.cover) : null,
    createdAt: Number(row.created_at),
    canUpload: Number(row.can_upload ?? 0) === 1,
    isAdmin: Number(row.is_admin ?? 0) === 1,
    isBanned: Number(row.is_banned ?? 0) === 1,
    sessionVersion: Number(row.session_version ?? 0),
    passwordHash: String(row.password_hash),
  }
}

function mapTrack(row: Row): Track {
  return {
    id: String(row.id),
    title: String(row.title),
    artist: String(row.artist),
    album: row.album ? String(row.album) : null,
    genre: row.genre ? String(row.genre) : null,
    duration: Number(row.duration ?? 0),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    size: Number(row.size ?? 0),
    uploaderId: String(row.uploader_id),
    playCount: Number(row.play_count ?? 0),
    createdAt: Number(row.created_at),
    liked: Number(row.liked ?? 0) > 0,
  }
}

function mapPlaylist(row: Row): Playlist {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    ownerId: String(row.owner_id),
    isPublic: Number(row.is_public ?? 1) === 1,
    createdAt: Number(row.created_at),
    trackCount: Number(row.track_count ?? 0),
    cover: row.cover ? String(row.cover) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    ownerName: String(row.owner_name ?? ''),
    ownerUsername: String(row.owner_username ?? ''),
  }
}

export function publicUser(user: UserRecord): UserPublic {
  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

/* ---------------------------------- users --------------------------------- */

export function getUserById(id: string): UserPublic | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined
  return row ? publicUser(mapUser(row)) : null
}

export function getUserByLogin(login: string): UserRecord | null {
  const value = login.trim().toLowerCase()
  const row = db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
    .get(value, value) as Row | undefined
  return row ? mapUser(row) : null
}

export function getUserByUsername(username: string): UserPublic | null {
  const row = db
    .prepare('SELECT * FROM users WHERE LOWER(username) = ?')
    .get(username.trim().toLowerCase()) as Row | undefined
  return row ? publicUser(mapUser(row)) : null
}

export function createUser(input: {
  email: string
  username: string
  displayName: string
  passwordHash: string
}): UserPublic {
  const id = randomUUID()
  const total = Number((db.prepare('SELECT COUNT(*) AS n FROM users').get() as Row).n)
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const isAdmin = total === 0 || (adminEmail !== '' && input.email.trim().toLowerCase() === adminEmail)
  db.prepare(
    `INSERT INTO users (id, email, username, display_name, password_hash, bio, can_upload, is_admin, is_banned, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    input.email.trim().toLowerCase(),
    input.username.trim(),
    input.displayName.trim(),
    input.passwordHash,
    null,
    isAdmin ? 1 : 0,
    isAdmin ? 1 : 0,
    Date.now(),
  )
  return getUserById(id)!
}

export function usedImageNames(): string[] {
  const rows = db
    .prepare(
      `SELECT avatar AS name FROM users WHERE avatar IS NOT NULL
       UNION ALL SELECT cover AS name FROM users WHERE cover IS NOT NULL
       UNION ALL SELECT avatar AS name FROM playlists WHERE avatar IS NOT NULL
       UNION ALL SELECT cover AS name FROM playlists WHERE cover IS NOT NULL`,
    )
    .all() as Row[]
  return rows.map((row) => String(row.name))
}

export function updateUserProfile(
  id: string,
  patch: {
    displayName?: string
    bio?: string | null
    status?: string | null
    avatar?: string | null
    cover?: string | null
  },
): UserPublic | null {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined
  if (!user) return null
  db.prepare(
    'UPDATE users SET display_name = ?, bio = ?, status = ?, avatar = ?, cover = ? WHERE id = ?',
  ).run(
    patch.displayName?.trim() || String(user.display_name),
    patch.bio === undefined ? user.bio : patch.bio,
    patch.status === undefined ? user.status : patch.status,
    patch.avatar === undefined ? user.avatar : patch.avatar,
    patch.cover === undefined ? user.cover : patch.cover,
    id,
  )
  return getUserById(id)
}

/** Password hash for server-side checks; never sent to the client. */
export function getUserPasswordHash(id: string): string | null {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as
    | Row
    | undefined
  return row ? String(row.password_hash) : null
}

export function setUserPassword(id: string, passwordHash: string): void {
  // Bumping session_version signs out every other device.
  db.prepare(
    'UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?',
  ).run(passwordHash, id)
}

export function bumpSessionVersion(id: string): void {
  db.prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?').run(id)
}

export function countAdmins(): number {
  return Number((db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1').get() as Row).n)
}

export function userTrackFileNames(userId: string): string[] {
  const rows = db
    .prepare('SELECT file_name FROM tracks WHERE uploader_id = ?')
    .all(userId) as Row[]
  return rows.map((row) => String(row.file_name))
}

export function userImageNames(userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT avatar AS name FROM users WHERE id = ? AND avatar IS NOT NULL
       UNION ALL SELECT cover AS name FROM users WHERE id = ? AND cover IS NOT NULL
       UNION ALL SELECT avatar AS name FROM playlists WHERE owner_id = ? AND avatar IS NOT NULL
       UNION ALL SELECT cover AS name FROM playlists WHERE owner_id = ? AND cover IS NOT NULL`,
    )
    .all(userId, userId, userId, userId) as Row[]
  return rows.map((row) => String(row.name))
}

export function deleteUserAccount(id: string): boolean {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return Number(result.changes) > 0
}

/* --------------------------------- tracks --------------------------------- */

export type TrackFilter = {
  viewerId?: string | null
  uploaderId?: string
  artist?: string
  genre?: string
  likedBy?: string
  playlistId?: string
  q?: string
  ids?: string[]
  limit?: number
  offset?: number
  sort?: 'new' | 'oldest' | 'popular'
}

function likeClause(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
}

export function listTracks(filter: TrackFilter = {}): Track[] {
  const where: string[] = []
  const params: (string | number)[] = [filter.viewerId ?? '']

  if (filter.uploaderId) {
    where.push('t.uploader_id = ?')
    params.push(filter.uploaderId)
  }
  if (filter.artist) {
    where.push('t.artist = ?')
    params.push(filter.artist)
  }
  if (filter.genre) {
    where.push('t.genre = ?')
    params.push(filter.genre)
  }
  if (filter.likedBy) {
    where.push('EXISTS (SELECT 1 FROM likes lk WHERE lk.track_id = t.id AND lk.user_id = ?)')
    params.push(filter.likedBy)
  }
  if (filter.playlistId) {
    where.push('EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.track_id = t.id AND pt.playlist_id = ?)')
    params.push(filter.playlistId)
  }
  if (filter.ids && filter.ids.length > 0) {
    where.push(`t.id IN (${filter.ids.map(() => '?').join(', ')})`)
    params.push(...filter.ids)
  }
  if (filter.q && filter.q.trim()) {
    where.push("t.search_text LIKE ? ESCAPE '\\'")
    params.push(likeClause(filter.q.trim().toLowerCase()))
  }

  const order =
    filter.sort === 'popular'
      ? 't.play_count DESC, t.created_at DESC'
      : filter.sort === 'oldest'
        ? 't.created_at ASC'
        : 't.created_at DESC'

  const limit = filter.limit ?? 200
  const offset = filter.offset ?? 0

  const sql = `
    SELECT t.*, (SELECT COUNT(*) FROM likes l WHERE l.track_id = t.id AND l.user_id = ?) AS liked
    FROM tracks t
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(sql).all(...params, limit, offset) as Row[]
  return rows.map(mapTrack)
}

export function getTrack(id: string, viewerId?: string | null): Track | null {
  const row = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM likes l WHERE l.track_id = t.id AND l.user_id = ?) AS liked
       FROM tracks t WHERE t.id = ?`,
    )
    .get(viewerId ?? '', id) as Row | undefined
  return row ? mapTrack(row) : null
}

export function createTrack(input: {
  title: string
  artist: string
  album: string | null
  genre: string | null
  duration: number
  fileName: string
  mimeType: string
  size: number
  uploaderId: string
  createdAt?: number
}): Track {
  const id = randomUUID()
  const searchText = [input.title, input.artist, input.album ?? '', input.genre ?? '']
    .join(' ')
    .toLowerCase()
  db.prepare(
    `INSERT INTO tracks (id, title, artist, album, genre, duration, file_name, mime_type, size, uploader_id, play_count, search_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    id,
    input.title,
    input.artist,
    input.album,
    input.genre,
    input.duration,
    input.fileName,
    input.mimeType,
    input.size,
    input.uploaderId,
    searchText,
    input.createdAt ?? Date.now(),
  )
  return getTrack(id)!
}

export function updateTrack(
  id: string,
  uploaderId: string,
  patch: { title?: string; artist?: string; album?: string | null; genre?: string | null },
): boolean {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as Row | undefined
  if (!track || track.uploader_id !== uploaderId) return false
  const title = patch.title?.trim() || String(track.title)
  const artist = patch.artist?.trim() || String(track.artist)
  const album = patch.album === undefined ? (track.album as string | null) : patch.album
  const genre = patch.genre === undefined ? (track.genre as string | null) : patch.genre
  const searchText = [title, artist, album ?? ''].join(' ').toLowerCase()
  db.prepare(
    'UPDATE tracks SET title = ?, artist = ?, album = ?, genre = ?, search_text = ? WHERE id = ?',
  ).run(title, artist, album, genre, searchText, id)
  return true
}

export function deleteTrackRow(id: string, uploaderId: string): Track | null {
  const track = getTrack(id)
  if (!track || track.uploaderId !== uploaderId) return null
  db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
  return track
}

export function trackFileNames(): string[] {
  return (db.prepare('SELECT file_name FROM tracks').all() as Row[]).map((r) =>
    String(r.file_name),
  )
}

const PLAY_DEDUPE_MS = 30_000

export function recordPlay(userId: string, trackId: string) {
  const last = db
    .prepare(
      'SELECT played_at FROM plays WHERE user_id = ? AND track_id = ? ORDER BY played_at DESC LIMIT 1',
    )
    .get(userId, trackId) as Row | undefined
  if (last && Date.now() - Number(last.played_at) < PLAY_DEDUPE_MS) return

  db.prepare('INSERT INTO plays (id, user_id, track_id, played_at) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    userId,
    trackId,
    Date.now(),
  )
  db.prepare('UPDATE tracks SET play_count = play_count + 1 WHERE id = ?').run(trackId)
}

export function recentlyPlayed(userId: string, limit = 8): Track[] {
  const rows = db
    .prepare(
      `SELECT t.*, 1 AS liked FROM tracks t
       JOIN (SELECT track_id, MAX(played_at) AS last FROM plays WHERE user_id = ? GROUP BY track_id) p
         ON p.track_id = t.id
       ORDER BY p.last DESC LIMIT ?`,
    )
    .all(userId, limit) as Row[]
  return rows.map(mapTrack)
}

/* --------------------------------- streaks -------------------------------- */

/** Listening of at least this many seconds closes the day and extends the streak. */
export const STREAK_GOAL_SECONDS = 60
/** Hard ceiling per day so a stuck client cannot inflate the counter. */
export const STREAK_DAY_CAP_SECONDS = 6 * 60 * 60

export type StreakState = {
  /** Consecutive days with the goal reached, ending today or yesterday. */
  current: number
  /** Longest run on record. */
  best: number
  /** Seconds listened on the requested day. */
  todaySeconds: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  return new Date(date.getTime() + offset * DAY_MS).toISOString().slice(0, 10)
}

export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function isStreakMilestone(days: number): boolean {
  return days === 10 || days === 30 || (days >= 50 && days % 50 === 0)
}

export function getStreak(userId: string, day: string): StreakState {
  const rows = db
    .prepare(
      'SELECT day, seconds FROM listening_days WHERE user_id = ? AND seconds >= ? ORDER BY day ASC',
    )
    .all(userId, STREAK_GOAL_SECONDS) as Row[]

  const days = rows.map((row) => String(row.day))
  const todayRow = db
    .prepare('SELECT seconds FROM listening_days WHERE user_id = ? AND day = ?')
    .get(userId, day) as Row | undefined
  const todaySeconds = Number(todayRow?.seconds ?? 0)

  const closed = new Set(days)
  let cursor = closed.has(day) ? day : shiftDay(day, -1)
  let current = 0
  while (closed.has(cursor)) {
    current += 1
    cursor = shiftDay(cursor, -1)
  }

  let best = 0
  let run = 0
  let previous: string | null = null
  for (const dayKeyValue of days) {
    run = previous && shiftDay(previous, 1) === dayKeyValue ? run + 1 : 1
    if (run > best) best = run
    previous = dayKeyValue
  }

  return { current, best, todaySeconds }
}

export function addListeningTime(userId: string, day: string, seconds: number): number {
  const value = Math.max(0, Math.min(Math.floor(seconds), 120))
  if (value === 0) return getStreak(userId, day).todaySeconds

  const row = db
    .prepare(
      `INSERT INTO listening_days (user_id, day, seconds) VALUES (?, ?, ?)
       ON CONFLICT (user_id, day) DO UPDATE
         SET seconds = MIN(seconds + excluded.seconds, ?)
       RETURNING seconds`,
    )
    .get(userId, day, value, STREAK_DAY_CAP_SECONDS) as Row | undefined
  return Number(row?.seconds ?? 0)
}

/** Total counted listening time across every day on record. */
export function getListeningSeconds(userId: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(seconds), 0) AS total FROM listening_days WHERE user_id = ?')
    .get(userId) as Row | undefined
  return Number(row?.total ?? 0)
}

/* ---------------------------------- likes --------------------------------- */

export function toggleLike(userId: string, trackId: string): boolean {
  const existing = db
    .prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?')
    .get(userId, trackId)
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND track_id = ?').run(userId, trackId)
    return false
  }
  db.prepare('INSERT INTO likes (user_id, track_id, created_at) VALUES (?, ?, ?)').run(
    userId,
    trackId,
    Date.now(),
  )
  return true
}

export function countLikes(userId: string): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE user_id = ?').get(userId) as Row
  return Number(row.n)
}

/* -------------------------------- playlists ------------------------------- */

const PLAYLIST_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count,
    u.display_name AS owner_name,
    u.username AS owner_username
  FROM playlists p JOIN users u ON u.id = p.owner_id
`

export function getPlaylist(id: string): Playlist | null {
  const row = db.prepare(`${PLAYLIST_SELECT} WHERE p.id = ?`).get(id) as Row | undefined
  return row ? mapPlaylist(row) : null
}

export function getPlaylistsByOwner(ownerId: string): Playlist[] {
  const rows = db
    .prepare(`${PLAYLIST_SELECT} WHERE p.owner_id = ? ORDER BY p.created_at DESC`)
    .all(ownerId) as Row[]
  return rows.map(mapPlaylist)
}

export function getPublicPlaylists(limit = 12): Playlist[] {
  const rows = db
    .prepare(`${PLAYLIST_SELECT} WHERE p.is_public = 1 ORDER BY track_count DESC, p.created_at DESC LIMIT ?`)
    .all(limit) as Row[]
  return rows.map(mapPlaylist)
}

export function searchPlaylists(q: string, limit = 12): Playlist[] {
  const rows = db
    .prepare(`${PLAYLIST_SELECT} WHERE p.is_public = 1 AND LOWER(p.name) LIKE ? ESCAPE '\\' ORDER BY track_count DESC LIMIT ?`)
    .all(likeClause(q.toLowerCase()), limit) as Row[]
  return rows.map(mapPlaylist)
}

export function createPlaylist(
  ownerId: string,
  name: string,
  description: string | null,
): Playlist {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO playlists (id, name, description, owner_id, is_public, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
  ).run(id, name.trim(), description, ownerId, Date.now())
  return getPlaylist(id)!
}

export function updatePlaylist(
  id: string,
  ownerId: string,
  patch: {
    name?: string
    description?: string | null
    avatar?: string | null
    cover?: string | null
  },
): Playlist | null {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Row | undefined
  if (!playlist || playlist.owner_id !== ownerId) return null
  db.prepare('UPDATE playlists SET name = ?, description = ?, avatar = ?, cover = ? WHERE id = ?').run(
    patch.name?.trim() || String(playlist.name),
    patch.description === undefined ? (playlist.description as string | null) : patch.description,
    patch.avatar === undefined ? playlist.avatar : patch.avatar,
    patch.cover === undefined ? playlist.cover : patch.cover,
    id,
  )
  return getPlaylist(id)
}

export function deletePlaylist(id: string, ownerId: string): Playlist | null {
  const playlist = getPlaylist(id)
  if (!playlist || playlist.ownerId !== ownerId) return null
  const result = db.prepare('DELETE FROM playlists WHERE id = ? AND owner_id = ?').run(id, ownerId)
  return Number(result.changes) > 0 ? playlist : null
}

export function getPlaylistTracks(playlistId: string, viewerId?: string | null): Track[] {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM likes l WHERE l.track_id = t.id AND l.user_id = ?) AS liked
       FROM tracks t
       JOIN playlist_tracks pt ON pt.track_id = t.id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position ASC`,
    )
    .all(viewerId ?? '', playlistId) as Row[]
  return rows.map(mapTrack)
}

export function addTrackToPlaylist(playlistId: string, trackId: string, ownerId: string): boolean {
  const playlist = db.prepare('SELECT owner_id FROM playlists WHERE id = ?').get(playlistId) as Row | undefined
  if (!playlist || playlist.owner_id !== ownerId) return false
  const existing = db
    .prepare('SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .get(playlistId, trackId)
  if (existing) return false
  const row = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS max FROM playlist_tracks WHERE playlist_id = ?')
    .get(playlistId) as Row
  db.prepare(
    'INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
  ).run(playlistId, trackId, Number(row.max) + 1, Date.now())
  return true
}

export function removeTrackFromPlaylist(playlistId: string, trackId: string, ownerId: string): boolean {
  const playlist = db.prepare('SELECT owner_id FROM playlists WHERE id = ?').get(playlistId) as Row | undefined
  if (!playlist || playlist.owner_id !== ownerId) return false
  const result = db
    .prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .run(playlistId, trackId)
  return Number(result.changes) > 0
}

export function reorderPlaylist(playlistId: string, ownerId: string, orderedTrackIds: string[]): boolean {
  const playlist = db.prepare('SELECT owner_id FROM playlists WHERE id = ?').get(playlistId) as Row | undefined
  if (!playlist || playlist.owner_id !== ownerId) return false
  const update = db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?')
  orderedTrackIds.forEach((trackId, index) => update.run(index + 1, playlistId, trackId))
  return true
}

/* --------------------------------- artists -------------------------------- */

export function listArtists(q?: string, limit = 24): ArtistSummary[] {
  const params: (string | number)[] = []
  let where = ''
  if (q && q.trim()) {
    where = "WHERE LOWER(artist) LIKE ? ESCAPE '\\' OR search_text LIKE ? ESCAPE '\\'"
    params.push(likeClause(q.toLowerCase()), likeClause(q.toLowerCase()))
  }
  const rows = db
    .prepare(
      `SELECT artist, COUNT(*) AS track_count, SUM(play_count) AS play_count
       FROM tracks t ${where}
       GROUP BY artist ORDER BY track_count DESC, play_count DESC LIMIT ?`,
    )
    .all(...params, limit) as Row[]
  return rows.map((r) => ({
    artist: String(r.artist),
    trackCount: Number(r.track_count),
    playCount: Number(r.play_count ?? 0),
  }))
}

/* ---------------------------------- stats --------------------------------- */

export function libraryStats(userId: string) {
  const tracks = db.prepare('SELECT COUNT(*) AS n FROM tracks').get() as Row
  const artists = db.prepare('SELECT COUNT(DISTINCT artist) AS n FROM tracks').get() as Row
  const uploads = db.prepare('SELECT COUNT(*) AS n FROM tracks WHERE uploader_id = ?').get(userId) as Row
  const likes = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE user_id = ?').get(userId) as Row
  return {
    tracks: Number(tracks.n),
    artists: Number(artists.n),
    uploads: Number(uploads.n),
    likes: Number(likes.n),
  }
}

/* ------------------------------ admin & safety ---------------------------- */

export function countUsers(): number {
  return Number((db.prepare('SELECT COUNT(*) AS n FROM users').get() as Row).n)
}

export function listAdminUsers(): AdminUserRow[] {
  const rows = db
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM tracks t WHERE t.uploader_id = u.id) AS uploads,
        (SELECT COALESCE(SUM(size), 0) FROM tracks t WHERE t.uploader_id = u.id) AS upload_bytes
       FROM users u ORDER BY u.created_at ASC`,
    )
    .all() as Row[]
  return rows.map((row) => ({
    ...publicUser(mapUser(row)),
    uploads: Number(row.uploads ?? 0),
    uploadBytes: Number(row.upload_bytes ?? 0),
  }))
}

export function setUserFlags(
  id: string,
  patch: { canUpload?: boolean; isAdmin?: boolean; isBanned?: boolean },
): boolean {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined
  if (!user) return false
  const canUpload = patch.canUpload === undefined ? Number(user.can_upload) : patch.canUpload ? 1 : 0
  const isAdmin = patch.isAdmin === undefined ? Number(user.is_admin) : patch.isAdmin ? 1 : 0
  const isBanned = patch.isBanned === undefined ? Number(user.is_banned) : patch.isBanned ? 1 : 0
  // Never lock the last admin out completely: keep admin access if flag was set.
  db.prepare('UPDATE users SET can_upload = ?, is_admin = ?, is_banned = ? WHERE id = ?').run(
    canUpload,
    isAdmin,
    isBanned,
    id,
  )
  return true
}

export function userUploadStats(userId: string): { count: number; bytes: number } {
  const row = db
    .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM tracks WHERE uploader_id = ?')
    .get(userId) as Row
  return { count: Number(row.n), bytes: Number(row.bytes) }
}

export function deleteTrackAsAdmin(id: string): Track | null {
  const track = getTrack(id)
  if (!track) return null
  db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
  return track
}

/* --------------------------------- invites -------------------------------- */

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateInviteCode(): string {
  const bytes = randomBytes(10)
  let code = ''
  for (let i = 0; i < 8; i += 1) code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length]
  return code
}

function mapInvite(row: Row): Invite {
  return {
    id: String(row.id),
    code: String(row.code),
    createdBy: String(row.created_by),
    creatorName: String(row.creator_name ?? ''),
    maxUses: Number(row.max_uses ?? 1),
    uses: Number(row.uses ?? 0),
    usedBy: row.used_by ? String(row.used_by) : null,
    usedByName: row.used_by_name ? String(row.used_by_name) : null,
    expiresAt: row.expires_at ? Number(row.expires_at) : null,
    createdAt: Number(row.created_at),
  }
}

const INVITE_SELECT = `
  SELECT i.*, c.display_name AS creator_name, u.display_name AS used_by_name
  FROM invites i
  JOIN users c ON c.id = i.created_by
  LEFT JOIN users u ON u.id = i.used_by
`

export function createInvite(createdBy: string, maxUses = 1, expiresInDays = 0): Invite {
  let code = generateInviteCode()
  const exists = db.prepare('SELECT 1 FROM invites WHERE code = ?')
  while (exists.get(code)) code = generateInviteCode()

  const id = randomUUID()
  const now = Date.now()
  const expiresAt = expiresInDays > 0 ? now + expiresInDays * 24 * 60 * 60 * 1000 : null
  db.prepare(
    `INSERT INTO invites (id, code, created_by, max_uses, uses, used_by, used_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
  ).run(id, code, createdBy, Math.max(1, Math.min(50, maxUses)), expiresAt, now)
  const created = db.prepare(`${INVITE_SELECT} WHERE i.id = ?`).get(id) as Row
  return mapInvite(created)
}

export function listInvites(): Invite[] {
  const rows = db.prepare(`${INVITE_SELECT} ORDER BY i.created_at DESC`).all() as Row[]
  return rows.map(mapInvite)
}

export function getInviteByCode(code: string): Invite | null {
  const row = db
    .prepare(`${INVITE_SELECT} WHERE i.code = ?`)
    .get(code.trim().toUpperCase()) as Row | undefined
  return row ? mapInvite(row) : null
}

export function redeemInvite(
  userId: string,
  rawCode: string,
): { ok: true } | { ok: false; error: string } {
  const user = getUserById(userId)
  if (!user) return { ok: false, error: 'Пользователь не найден' }
  if (user.isBanned) return { ok: false, error: 'Аккаунт заблокирован' }
  if (user.canUpload || user.isAdmin) return { ok: false, error: 'У вас уже есть доступ к загрузке' }

  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Введите код' }

  const row = db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as Row | undefined
  if (!row) return { ok: false, error: 'Код не найден' }
  if (row.expires_at && Number(row.expires_at) < Date.now()) {
    return { ok: false, error: 'Срок действия кода истёк' }
  }
  if (Number(row.uses) >= Number(row.max_uses)) {
    return { ok: false, error: 'Код уже использован' }
  }

  db.prepare('UPDATE invites SET uses = uses + 1, used_by = ?, used_at = ? WHERE id = ?').run(
    userId,
    Date.now(),
    String(row.id),
  )
  db.prepare('UPDATE users SET can_upload = 1 WHERE id = ?').run(userId)
  return { ok: true }
}

export function deleteInvite(id: string): boolean {
  const result = db.prepare('DELETE FROM invites WHERE id = ?').run(id)
  return Number(result.changes) > 0
}

/* --------------------------------- reports -------------------------------- */

function mapReport(row: Row): Report {
  return {
    id: String(row.id),
    trackId: String(row.track_id),
    trackTitle: String(row.track_title ?? ''),
    trackArtist: String(row.track_artist ?? ''),
    reporterId: row.reporter_id ? String(row.reporter_id) : null,
    reporterName: row.reporter_name ? String(row.reporter_name) : null,
    reason: String(row.reason),
    comment: row.comment ? String(row.comment) : null,
    status: row.status === 'resolved' ? 'resolved' : 'open',
    createdAt: Number(row.created_at),
  }
}

const REPORT_SELECT = `
  SELECT r.*, t.title AS track_title, t.artist AS track_artist, u.display_name AS reporter_name
  FROM reports r
  JOIN tracks t ON t.id = r.track_id
  LEFT JOIN users u ON u.id = r.reporter_id
`

export function createReport(input: {
  trackId: string
  reporterId: string | null
  reason: string
  comment: string | null
}): boolean {
  if (!getTrack(input.trackId)) return false
  db.prepare(
    'INSERT INTO reports (id, track_id, reporter_id, reason, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    randomUUID(),
    input.trackId,
    input.reporterId,
    input.reason.slice(0, 40),
    input.comment ? input.comment.slice(0, 500) : null,
    'open',
    Date.now(),
  )
  return true
}

export function listReports(status?: 'open' | 'resolved'): Report[] {
  const rows = status
    ? (db.prepare(`${REPORT_SELECT} WHERE r.status = ? ORDER BY r.created_at DESC`).all(status) as Row[])
    : (db.prepare(`${REPORT_SELECT} ORDER BY r.status ASC, r.created_at DESC`).all() as Row[])
  return rows.map(mapReport)
}

export function countOpenReports(): number {
  return Number(
    (db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'").get() as Row).n,
  )
}

export function setReportStatus(id: string, status: 'open' | 'resolved'): boolean {
  const result = db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id)
  return Number(result.changes) > 0
}
