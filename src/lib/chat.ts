import { randomUUID } from 'node:crypto'
import { clampAvatarFrame, type AvatarFrame } from './avatar-frame'
import { CHAT_MESSAGE_MAX, CHAT_PAGE_SIZE } from './chat-config'
import { db } from './db'
import { PRESENCE_ONLINE_MS } from './presence'
import { areFriends } from './social'

type Row = Record<string, any>

const TYPING_TTL_MS = 5_000

export type ChatTrackAttachment = {
  id: string
  title: string
  artist: string
  album: string | null
  duration: number
}

export type ChatPlaylistAttachment = {
  id: string
  name: string
  ownerName: string
  avatar: string | null
  cover: string | null
  trackCount: number
}

export type ChatAttachment =
  | { type: 'track'; track: ChatTrackAttachment | null }
  | { type: 'playlist'; playlist: ChatPlaylistAttachment | null }

export type ChatMessage = {
  id: number
  body: string
  createdAt: number
  mine: boolean
  attachment: ChatAttachment | null
}

export type ChatSummary = {
  chatId: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  lastMessage: string | null
  lastMessageAt: number
  lastMessageMine: boolean
  unread: number
  online: boolean
  lastSeenAt: number
  muted: boolean
  typing: boolean
}

export type ChatOther = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  online: boolean
  lastSeenAt: number
}

export type ChatThread = {
  other: ChatOther
  messages: ChatMessage[]
  hasMore: boolean
  otherTyping: boolean
  muted: boolean
}

export type ChatNotification = {
  id: number
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  body: string
  createdAt: number
}

function userByUsername(username: string): Row | undefined {
  return db
    .prepare(
      'SELECT id, username, display_name, avatar, avatar_frame, last_seen_at, is_banned FROM users WHERE LOWER(username) = ?',
    )
    .get(username.trim().toLowerCase()) as Row | undefined
}

function isOnline(lastSeenAt: number): boolean {
  return lastSeenAt > 0 && Date.now() - lastSeenAt < PRESENCE_ONLINE_MS
}

function mapOther(row: Row): ChatOther {
  const lastSeenAt = Number(row.last_seen_at ?? 0)
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatar: row.avatar ? String(row.avatar) : null,
    avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
    lastSeenAt,
    online: isOnline(lastSeenAt),
  }
}

function pairKey(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA]
}

function findChatId(userA: string, userB: string): string | null {
  const [a, b] = pairKey(userA, userB)
  const row = db
    .prepare('SELECT id FROM chats WHERE user_a = ? AND user_b = ?')
    .get(a, b) as Row | undefined
  return row ? String(row.id) : null
}

function cleanBody(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, CHAT_MESSAGE_MAX)
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}

/** Loads track/playlist cards for a page of messages in two queries. */
function hydrateAttachments(rows: Row[]): Map<number, ChatAttachment> {
  const trackIds = new Set<string>()
  const playlistIds = new Set<string>()
  for (const row of rows) {
    if (!row.attachment_id) continue
    if (row.attachment_type === 'track') trackIds.add(String(row.attachment_id))
    if (row.attachment_type === 'playlist') playlistIds.add(String(row.attachment_id))
  }

  const tracks = new Map<string, ChatTrackAttachment>()
  if (trackIds.size > 0) {
    const list = db
      .prepare(
        `SELECT id, title, artist, album, duration FROM tracks
         WHERE id IN (${placeholders(trackIds.size)}) AND review_status = 'approved'`,
      )
      .all(...trackIds) as Row[]
    for (const track of list) {
      tracks.set(String(track.id), {
        id: String(track.id),
        title: String(track.title),
        artist: String(track.artist),
        album: track.album ? String(track.album) : null,
        duration: Number(track.duration ?? 0),
      })
    }
  }

  const playlists = new Map<string, ChatPlaylistAttachment>()
  if (playlistIds.size > 0) {
    const list = db
      .prepare(
        `SELECT p.id, p.name, p.avatar, p.cover, u.display_name AS owner_name,
                (SELECT COUNT(*) FROM playlist_tracks pt
                 JOIN tracks t ON t.id = pt.track_id
                 WHERE pt.playlist_id = p.id AND t.review_status = 'approved') AS track_count
         FROM playlists p JOIN users u ON u.id = p.owner_id
         WHERE p.id IN (${placeholders(playlistIds.size)}) AND p.is_public = 1`,
      )
      .all(...playlistIds) as Row[]
    for (const playlist of list) {
      playlists.set(String(playlist.id), {
        id: String(playlist.id),
        name: String(playlist.name),
        ownerName: String(playlist.owner_name),
        avatar: playlist.avatar ? String(playlist.avatar) : null,
        cover: playlist.cover ? String(playlist.cover) : null,
        trackCount: Number(playlist.track_count ?? 0),
      })
    }
  }

  const result = new Map<number, ChatAttachment>()
  for (const row of rows) {
    if (!row.attachment_id) continue
    if (row.attachment_type === 'track') {
      result.set(Number(row.id), { type: 'track', track: tracks.get(String(row.attachment_id)) ?? null })
    } else if (row.attachment_type === 'playlist') {
      result.set(Number(row.id), {
        type: 'playlist',
        playlist: playlists.get(String(row.attachment_id)) ?? null,
      })
    }
  }
  return result
}

function attachmentPreview(row: Row): string | null {
  if (row.attachment_type === 'track') {
    return row.attachment_title ? `Трек: ${row.attachment_title}` : 'Трек недоступен'
  }
  if (row.attachment_type === 'playlist') {
    return row.attachment_name ? `Плейлист: ${row.attachment_name}` : 'Плейлист недоступен'
  }
  return null
}

/** Conversations the viewer can see: only chats with current mutual friends. */
export function listChats(userId: string): ChatSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.last_message_at,
              cm.last_read_id, cm.muted,
              u.username, u.display_name, u.avatar, u.avatar_frame, u.last_seen_at,
              om.typing_at AS other_typing,
              m.body AS last_body, m.sender_id AS last_sender,
              m.attachment_type, lt.title AS attachment_title, lp.name AS attachment_name,
              (SELECT COUNT(*) FROM chat_messages x
               WHERE x.chat_id = c.id AND x.sender_id <> ? AND x.id > cm.last_read_id) AS unread
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ?
       LEFT JOIN chat_members om ON om.chat_id = c.id AND om.user_id <> cm.user_id
       JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       LEFT JOIN chat_messages m ON m.id =
         (SELECT id FROM chat_messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1)
       LEFT JOIN tracks lt ON m.attachment_type = 'track' AND lt.id = m.attachment_id
         AND lt.review_status = 'approved'
       LEFT JOIN playlists lp ON m.attachment_type = 'playlist' AND lp.id = m.attachment_id
         AND lp.is_public = 1
       WHERE (c.user_a = ? OR c.user_b = ?)
         AND EXISTS (
           SELECT 1 FROM follows f1
           JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
           WHERE f1.follower_id = ? AND f1.following_id = u.id
         )
       ORDER BY c.last_message_at DESC`,
    )
    .all(userId, userId, userId, userId, userId, userId) as Row[]

  const now = Date.now()
  return rows.map((row) => {
    const lastSeenAt = Number(row.last_seen_at ?? 0)
    return {
      chatId: String(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      avatar: row.avatar ? String(row.avatar) : null,
      avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
      lastMessage: row.last_body ? String(row.last_body) : attachmentPreview(row),
      lastMessageAt: Number(row.last_message_at ?? 0),
      lastMessageMine: String(row.last_sender ?? '') === userId,
      unread: Number(row.unread ?? 0),
      online: isOnline(lastSeenAt),
      lastSeenAt,
      muted: Number(row.muted ?? 0) === 1,
      typing: Number(row.other_typing ?? 0) > now - TYPING_TTL_MS,
    }
  })
}

export function getTotalUnread(userId: string): number {
  return listChats(userId).reduce((total, chat) => total + chat.unread, 0)
}

type ThreadOptions = {
  afterId?: number
  beforeId?: number
}

export type ChatThreadResult =
  | { ok: true; thread: ChatThread }
  | { ok: false; status: 403 | 404; error: string }

export function getChatThread(
  userId: string,
  otherUsername: string,
  options: ThreadOptions = {},
): ChatThreadResult {
  const other = userByUsername(otherUsername)
  if (!other || Number(other.is_banned ?? 0) === 1) {
    return { ok: false, status: 404, error: 'Пользователь не найден' }
  }
  const otherId = String(other.id)
  if (otherId === userId) return { ok: false, status: 404, error: 'Пользователь не найден' }
  if (!areFriends(userId, otherId)) {
    return { ok: false, status: 403, error: 'Переписка доступна только друзьям' }
  }

  const chatId = findChatId(userId, otherId)
  if (!chatId) {
    return {
      ok: true,
      thread: {
        other: mapOther(other),
        messages: [],
        hasMore: false,
        otherTyping: false,
        muted: false,
      },
    }
  }

  const mine = db
    .prepare('SELECT muted FROM chat_members WHERE chat_id = ? AND user_id = ?')
    .get(chatId, userId) as Row | undefined
  const otherMember = db
    .prepare(
      'SELECT typing_at FROM chat_members WHERE chat_id = ? AND user_id <> ? LIMIT 1',
    )
    .get(chatId, userId) as Row | undefined
  const muted = Number(mine?.muted ?? 0) === 1
  const otherTyping = Number(otherMember?.typing_at ?? 0) > Date.now() - TYPING_TTL_MS

  let rows: Row[]
  let hasMore = false

  if (options.afterId && options.afterId > 0) {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, attachment_type, attachment_id, created_at FROM chat_messages WHERE chat_id = ? AND id > ? ORDER BY id ASC LIMIT 100',
      )
      .all(chatId, Math.floor(options.afterId)) as Row[]
  } else if (options.beforeId && options.beforeId > 0) {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, attachment_type, attachment_id, created_at FROM chat_messages WHERE chat_id = ? AND id < ? ORDER BY id DESC LIMIT ?',
      )
      .all(chatId, Math.floor(options.beforeId), CHAT_PAGE_SIZE) as Row[]
    hasMore = rows.length === CHAT_PAGE_SIZE
    rows.reverse()
  } else {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, attachment_type, attachment_id, created_at FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?',
      )
      .all(chatId, CHAT_PAGE_SIZE) as Row[]
    hasMore = rows.length === CHAT_PAGE_SIZE
    rows.reverse()
  }

  const attachments = hydrateAttachments(rows)

  return {
    ok: true,
    thread: {
      other: mapOther(other),
      hasMore,
      otherTyping,
      muted,
      messages: rows.map((row) => ({
        id: Number(row.id),
        body: String(row.body),
        createdAt: Number(row.created_at),
        mine: String(row.sender_id) === userId,
        attachment: attachments.get(Number(row.id)) ?? null,
      })),
    },
  }
}

export type ChatAttachmentInput = {
  type: 'track' | 'playlist'
  id: string
}

export type SendMessageResult =
  | {
      ok: true
      message: ChatMessage
      chatId: string
      recipientId: string
      recipientMuted: boolean
    }
  | { ok: false; status: 400 | 403 | 404; error: string }

export function sendChatMessage(
  userId: string,
  otherUsername: string,
  rawBody: string,
  attachmentInput?: ChatAttachmentInput | null,
): SendMessageResult {
  const other = userByUsername(otherUsername)
  if (!other || Number(other.is_banned ?? 0) === 1) {
    return { ok: false, status: 404, error: 'Пользователь не найден' }
  }
  const otherId = String(other.id)
  if (otherId === userId) return { ok: false, status: 404, error: 'Пользователь не найден' }
  if (!areFriends(userId, otherId)) {
    return { ok: false, status: 403, error: 'Писать можно только друзьям' }
  }

  let attachment: ChatAttachment | null = null
  if (attachmentInput) {
    const attachmentId = attachmentInput.id.trim()
    if (attachmentInput.type === 'track') {
      const row = db
        .prepare(
          `SELECT id, title, artist, album, duration FROM tracks
           WHERE id = ? AND review_status = 'approved'`,
        )
        .get(attachmentId) as Row | undefined
      if (!row) {
        return { ok: false, status: 400, error: 'Этот трек недоступен для отправки' }
      }
      attachment = {
        type: 'track',
        track: {
          id: String(row.id),
          title: String(row.title),
          artist: String(row.artist),
          album: row.album ? String(row.album) : null,
          duration: Number(row.duration ?? 0),
        },
      }
    } else if (attachmentInput.type === 'playlist') {
      const row = db
        .prepare(
          `SELECT p.id, p.name, p.avatar, p.cover, u.display_name AS owner_name,
                  (SELECT COUNT(*) FROM playlist_tracks pt
                   JOIN tracks t ON t.id = pt.track_id
                   WHERE pt.playlist_id = p.id AND t.review_status = 'approved') AS track_count
           FROM playlists p JOIN users u ON u.id = p.owner_id
           WHERE p.id = ? AND p.is_public = 1`,
        )
        .get(attachmentId) as Row | undefined
      if (!row) {
        return { ok: false, status: 400, error: 'Поделиться можно только публичным плейлистом' }
      }
      attachment = {
        type: 'playlist',
        playlist: {
          id: String(row.id),
          name: String(row.name),
          ownerName: String(row.owner_name),
          avatar: row.avatar ? String(row.avatar) : null,
          cover: row.cover ? String(row.cover) : null,
          trackCount: Number(row.track_count ?? 0),
        },
      }
    } else {
      return { ok: false, status: 400, error: 'Неизвестное вложение' }
    }
  }

  const body = cleanBody(rawBody)
  if (!body && !attachment) return { ok: false, status: 400, error: 'Сообщение пустое' }

  const [a, b] = pairKey(userId, otherId)
  const now = Date.now()
  const chatId = randomUUID()

  db.exec('BEGIN IMMEDIATE')
  try {
    const chat = db
      .prepare(
        `INSERT INTO chats (id, user_a, user_b, created_at, last_message_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_a, user_b) DO UPDATE SET last_message_at = excluded.last_message_at
         RETURNING id`,
      )
      .get(chatId, a, b, now, now) as Row | undefined
    if (!chat) throw new Error('Chat was not created')

    const id = String(chat.id)
    db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(id, userId)
    db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(
      id,
      otherId,
    )

    const inserted = db
      .prepare(
        `INSERT INTO chat_messages
           (chat_id, sender_id, body, attachment_type, attachment_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        userId,
        body,
        attachment?.type ?? null,
        attachment
          ? attachment.type === 'track'
            ? attachment.track?.id ?? null
            : attachment.playlist?.id ?? null
          : null,
        now,
      )
    const messageId = Number(inserted.lastInsertRowid)
    db.prepare('UPDATE chat_members SET typing_at = 0 WHERE chat_id = ? AND user_id = ?').run(
      id,
      userId,
    )
    const recipient = db
      .prepare('SELECT muted FROM chat_members WHERE chat_id = ? AND user_id = ?')
      .get(id, otherId) as Row | undefined

    db.exec('COMMIT')
    return {
      ok: true,
      chatId: id,
      recipientId: otherId,
      recipientMuted: Number(recipient?.muted ?? 0) === 1,
      message: { id: messageId, body, createdAt: now, mine: true, attachment },
    }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Marks everything in the conversation as read for this member. */
export function markChatRead(userId: string, otherUsername: string): number {
  const other = userByUsername(otherUsername)
  if (!other) return getTotalUnread(userId)
  const chatId = findChatId(userId, String(other.id))
  if (!chatId) return getTotalUnread(userId)

  const latest = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS id FROM chat_messages WHERE chat_id = ?')
    .get(chatId) as Row | undefined
  db.prepare(
    'UPDATE chat_members SET last_read_id = MAX(last_read_id, ?) WHERE chat_id = ? AND user_id = ?',
  ).run(Number(latest?.id ?? 0), chatId, userId)

  return getTotalUnread(userId)
}

export type ChatMutationResult =
  | { ok: true; muted: boolean }
  | { ok: false; status: 404; error: string }

/** Per-conversation notification switch. Messages and unread stay untouched. */
export function setChatMuted(
  userId: string,
  otherUsername: string,
  muted: boolean,
): ChatMutationResult {
  const other = userByUsername(otherUsername)
  if (!other) return { ok: false, status: 404, error: 'Пользователь не найден' }
  const chatId = findChatId(userId, String(other.id))
  if (!chatId) return { ok: false, status: 404, error: 'Переписки пока нет' }

  db.prepare('UPDATE chat_members SET muted = ? WHERE chat_id = ? AND user_id = ?').run(
    muted ? 1 : 0,
    chatId,
    userId,
  )
  return { ok: true, muted }
}

/** Stores a short-lived typing marker; no chat is created just for typing. */
export function touchChatTyping(userId: string, otherUsername: string): boolean {
  const other = userByUsername(otherUsername)
  if (!other) return false
  const otherId = String(other.id)
  if (!areFriends(userId, otherId)) return false
  const chatId = findChatId(userId, otherId)
  if (!chatId) return false

  db.prepare('UPDATE chat_members SET typing_at = ? WHERE chat_id = ? AND user_id = ?').run(
    Date.now(),
    chatId,
    userId,
  )
  return true
}

/**
 * Messages that deserve a toast: unread, addressed to the viewer, in chats
 * that are not muted. The first call with afterId = 0 is only a baseline.
 */
export function listNotifications(
  userId: string,
  afterId: number,
): { items: ChatNotification[]; latest: number } {
  const latestRow = db
    .prepare(
      `SELECT COALESCE(MAX(m.id), 0) AS id
       FROM chat_messages m
       JOIN chat_members cm ON cm.chat_id = m.chat_id
       WHERE cm.user_id = ?`,
    )
    .get(userId) as Row | undefined
  const latest = Number(latestRow?.id ?? 0)

  if (afterId <= 0) return { items: [], latest }

  const rows = db
    .prepare(
      `SELECT m.id, m.body, m.created_at, m.attachment_type,
              lt.title AS attachment_title, lp.name AS attachment_name,
              u.username, u.display_name, u.avatar, u.avatar_frame
       FROM chat_messages m
       JOIN chats c ON c.id = m.chat_id
       JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ?
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN tracks lt ON m.attachment_type = 'track' AND lt.id = m.attachment_id
         AND lt.review_status = 'approved'
       LEFT JOIN playlists lp ON m.attachment_type = 'playlist' AND lp.id = m.attachment_id
         AND lp.is_public = 1
       WHERE (c.user_a = ? OR c.user_b = ?)
         AND m.sender_id <> ?
         AND m.id > ?
         AND m.id > cm.last_read_id
         AND cm.muted = 0
         AND EXISTS (
           SELECT 1 FROM follows f1
           JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
           WHERE f1.follower_id = ? AND f1.following_id = u.id
         )
       ORDER BY m.id DESC
       LIMIT 5`,
    )
    .all(userId, userId, userId, userId, Math.floor(afterId), userId) as Row[]

  return {
    latest,
    items: rows.reverse().map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      avatar: row.avatar ? String(row.avatar) : null,
      avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
      body: String(row.body) || attachmentPreview(row) || 'Сообщение',
      createdAt: Number(row.created_at),
    })),
  }
}
