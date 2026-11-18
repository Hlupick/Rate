/**
 * Seeds MONAH with a demo catalogue: 10 synthesized tracks, covers, artists,
 * a demo listener account, playlists, likes and listening history.
 *
 * Usage: npm run seed [-- --force]
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { Mp3Encoder } from '@breezystack/lamejs'
import { composeSong, SR } from './synth.mjs'
import { makeCover } from './png.mjs'
import { SONGS } from './songs.mjs'

const ROOT = process.cwd()
const STORAGE = path.join(ROOT, 'storage')
const TRACKS_DIR = path.join(STORAGE, 'tracks')
const COVERS_DIR = path.join(STORAGE, 'covers')
const FORCE = process.argv.includes('--force')

for (const dir of [STORAGE, TRACKS_DIR, COVERS_DIR]) fs.mkdirSync(dir, { recursive: true })

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL, password_hash TEXT NOT NULL, bio TEXT,
  can_upload INTEGER NOT NULL DEFAULT 0, is_admin INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT,
  genre TEXT, duration REAL NOT NULL DEFAULT 0, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0, cover TEXT, uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  play_count INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, added_at INTEGER NOT NULL, PRIMARY KEY (playlist_id, track_id)
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, PRIMARY KEY (user_id, track_id)
);
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE, played_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0,
  used_by TEXT, used_at INTEGER, expires_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL, comment TEXT, status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count);
CREATE INDEX IF NOT EXISTS idx_plays_user ON plays(user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks ON playlist_tracks(playlist_id, position);
`

const db = new DatabaseSync(path.join(STORAGE, 'monah.db'))
db.exec(SCHEMA)
for (const sql of [
  'ALTER TABLE tracks ADD COLUMN genre TEXT',
  'ALTER TABLE users ADD COLUMN can_upload INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0',
]) {
  try {
    db.exec(sql)
  } catch {
    /* exists */
  }
}

const existing = Number(db.prepare('SELECT COUNT(*) AS n FROM tracks').get().n)

if (existing > 0 && !FORCE) {
  console.log(`В библиотеке уже ${existing} трек(ов) — пропускаю сид. Запусти "npm run seed -- --force", чтобы пересоздать.`)
  process.exit(0)
}

if (FORCE) {
  console.log('--force: очищаю библиотеку')
  for (const table of ['plays', 'likes', 'playlist_tracks', 'playlists', 'tracks', 'users']) {
    db.exec(`DELETE FROM ${table}`)
  }
  for (const dir of [TRACKS_DIR, COVERS_DIR]) {
    for (const file of fs.readdirSync(dir)) fs.rmSync(path.join(dir, file), { force: true })
  }
}

/* ---------------------------- mp3 encoding ---------------------------- */

function encodeMp3(left, right, kbps = 160) {
  const encoder = new Mp3Encoder(2, SR, kbps)
  const blockSize = 1152
  const chunks = []
  const leftBlock = new Int16Array(blockSize)
  const rightBlock = new Int16Array(blockSize)

  for (let offset = 0; offset < left.length; offset += blockSize) {
    const len = Math.min(blockSize, left.length - offset)
    for (let i = 0; i < len; i += 1) {
      const l = Math.max(-1, Math.min(1, left[offset + i]))
      const r = Math.max(-1, Math.min(1, right[offset + i]))
      leftBlock[i] = l < 0 ? l * 32768 : l * 32767
      rightBlock[i] = r < 0 ? r * 32768 : r * 32767
    }
    for (let i = len; i < blockSize; i += 1) {
      leftBlock[i] = 0
      rightBlock[i] = 0
    }
    const buffer = encoder.encodeBuffer(leftBlock, rightBlock)
    if (buffer.length > 0) chunks.push(Buffer.from(buffer))
  }
  const tail = encoder.flush()
  if (tail.length > 0) chunks.push(Buffer.from(tail))
  return Buffer.concat(chunks)
}

/* ------------------------------- seeding ------------------------------ */

const now = Date.now()
const passwordHash = bcrypt.hashSync('monah123', 10)
const userIds = new Map()

function ensureUser(username, displayName, email, { admin = false, canUpload = false } = {}) {
  const found = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (found) {
    if (admin || canUpload) {
      db.prepare('UPDATE users SET can_upload = 1, is_admin = ? WHERE id = ?').run(
        admin ? 1 : 0,
        found.id,
      )
    }
    return String(found.id)
  }
  const id = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, username, display_name, password_hash, bio, can_upload, is_admin, is_banned, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    email,
    username,
    displayName,
    passwordHash,
    null,
    admin || canUpload ? 1 : 0,
    admin ? 1 : 0,
    now - 1000 * 60 * 60 * 24 * 40,
  )
  return id
}

const demoId = ensureUser('demo', 'Стас', 'demo@monah.local', { admin: true, canUpload: true })

const artistSlugs = {
  'Monah Collective': 'monahcollective',
  Vela: 'vela',
  'Kirill Ostrov': 'kirillostrov',
  'Тайга 63': 'tayga63',
  'Sonya Raeva': 'sonyaraeva',
  'Node Zero': 'nodezero',
  'Lumen Field': 'lumenfield',
}

for (const [artist, slug] of Object.entries(artistSlugs)) {
  userIds.set(artist, ensureUser(slug, artist, `${slug}@monah.local`, { canUpload: true }))
}

const inserted = []
const total = SONGS.length

for (let index = 0; index < SONGS.length; index += 1) {
  const song = SONGS[index]
  const number = String(index + 1).padStart(2, '0')
  const fileName = `demo-${number}.mp3`
  const coverName = `demo-${number}.png`
  const audioPath = path.join(TRACKS_DIR, fileName)
  const coverPath = path.join(COVERS_DIR, coverName)

  const started = Date.now()
  process.stdout.write(`[${index + 1}/${total}] ${song.artist} — ${song.title} … `)

  const rendered = composeSong(song)
  const mp3 = encodeMp3(rendered.left, rendered.right)
  fs.writeFileSync(audioPath, mp3)
  fs.writeFileSync(
    coverPath,
    makeCover({ size: 640, palette: song.palette, style: song.coverStyle, seed: song.seed }),
  )

  const id = randomUUID()
  const createdAt = now - index * 1000 * 60 * 60 * 7 - 1000 * 60 * 60 * 3
  db.prepare(
    `INSERT INTO tracks (id, title, artist, album, genre, duration, file_name, mime_type, size, cover, uploader_id, play_count, search_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    song.title,
    song.artist,
    song.album,
    song.genre,
    rendered.duration,
    fileName,
    'audio/mpeg',
    mp3.length,
    coverName,
    userIds.get(song.artist) ?? demoId,
    song.playCount,
    `${song.title} ${song.artist} ${song.album} ${song.genre}`.toLowerCase(),
    createdAt,
  )

  inserted.push({ id, song })
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`${rendered.duration.toFixed(0)} с, ${(mp3.length / 1024 / 1024).toFixed(1)} МБ (${secs} с)`)
}

/* ------------------------------ playlists ----------------------------- */

const playlistDefs = [
  {
    name: 'Ночная поездка',
    description: 'Для последнего трамвая и пустых улиц.',
    slugs: ['nochnoy-tramvay', 'gravitatsiya', 'medlennyy-svet', 'dom-na-vode'],
  },
  {
    name: 'Фокус',
    description: 'Фон без слов, чтобы не отвлекаться.',
    slugs: ['steklyannyy-dozhd', 'severnyy-shum', 'medlennyy-svet'],
  },
  {
    name: 'Утро',
    description: 'Медленный старт: кофе, свет, тишина.',
    slugs: ['vtoroy-etazh', 'tikhiy-chas', 'dom-na-vode'],
  },
]

const bySlug = new Map(inserted.map((item) => [item.song.slug, item.id]))

for (const def of playlistDefs) {
  const playlistId = randomUUID()
  db.prepare(
    'INSERT INTO playlists (id, name, description, owner_id, is_public, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  ).run(playlistId, def.name, def.description, demoId, now - 1000 * 60 * 60 * 20)
  def.slugs.forEach((slug, position) => {
    const trackId = bySlug.get(slug)
    if (!trackId) return
    db.prepare(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
    ).run(playlistId, trackId, position + 1, now - 1000 * 60 * 60 * 20)
  })
}

/* ------------------------- likes & play history ----------------------- */

const likedSlugs = ['pepel-i-myod', 'nochnoy-tramvay', 'dom-na-vode', 'severnyy-shum']
for (const slug of likedSlugs) {
  const trackId = bySlug.get(slug)
  if (trackId) {
    db.prepare('INSERT OR IGNORE INTO likes (user_id, track_id, created_at) VALUES (?, ?, ?)').run(
      demoId,
      trackId,
      now - 1000 * 60 * 60 * 12,
    )
  }
}

const history = [
  ['vtoroy-etazh', 9],
  ['pepel-i-myod', 26],
  ['gravitatsiya', 52],
  ['nochnoy-tramvay', 80],
  ['medlennyy-svet', 120],
  ['dom-na-vode', 300],
  ['steklyannyy-dozhd', 640],
  ['tikhiy-chas', 1200],
]
for (const [slug, minutesAgo] of history) {
  const trackId = bySlug.get(slug)
  if (!trackId) continue
  db.prepare('INSERT INTO plays (id, user_id, track_id, played_at) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    demoId,
    trackId,
    now - minutesAgo * 60 * 1000,
  )
}

const totalSeconds = inserted.reduce((acc, item) => acc + item.song.targetDuration, 0)
console.log('')
console.log(`Готово: ${inserted.length} треков, ${Math.round(totalSeconds / 60)} минут музыки.`)
console.log('Демо-аккаунт: demo@monah.local / monah123')
