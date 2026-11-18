import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

const globalForDb = globalThis as unknown as { __monahDb?: DatabaseSync }

export const STORAGE_DIR = path.join(process.cwd(), 'storage')
export const TRACKS_DIR = path.join(STORAGE_DIR, 'tracks')
export const COVERS_DIR = path.join(STORAGE_DIR, 'covers')

for (const dir of [STORAGE_DIR, TRACKS_DIR, COVERS_DIR]) {
  fs.mkdirSync(dir, { recursive: true })
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  bio TEXT,
  status TEXT,
  status_color TEXT,
  avatar TEXT,
  cover TEXT,
  avatar_frame TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER,
  can_upload INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  is_banned INTEGER NOT NULL DEFAULT 0,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  duration REAL NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  cover TEXT,
  uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  play_count INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  search_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  source_url TEXT,
  cover TEXT,
  avatar TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS playlist_drafts (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS listening_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS streak_returns (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  month TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS user_frames (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frame TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, frame)
);

CREATE TABLE IF NOT EXISTS point_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, kind, ref)
);

CREATE TABLE IF NOT EXISTS point_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  typing_at INTEGER NOT NULL DEFAULT 0,
  muted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  used_by TEXT,
  used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count);
CREATE INDEX IF NOT EXISTS idx_plays_user ON plays(user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_plays_track_user ON plays(track_id, user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_listening_days_user ON listening_days(user_id, day);
CREATE INDEX IF NOT EXISTS idx_streak_returns_month ON streak_returns(user_id, month);
CREATE INDEX IF NOT EXISTS idx_point_events_user ON point_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_drafts_playlist ON playlist_drafts(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlists_owner ON playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_likes_track ON likes(track_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chats_user_a ON chats(user_a, last_message_at);
CREATE INDEX IF NOT EXISTS idx_chats_user_b ON chats(user_b, last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email, created_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, created_at);
`

function createDb() {
  const db = new DatabaseSync(path.join(STORAGE_DIR, 'monah.db'))
  // Several Next.js workers can open the database during a build; wait for
  // other writers instead of failing with SQLITE_BUSY.
  db.exec('PRAGMA busy_timeout = 10000')
  db.exec(SCHEMA)
  // Lightweight migrations for databases created before a column existed.
  const migrations = [
    'ALTER TABLE tracks ADD COLUMN genre TEXT',
    'ALTER TABLE users ADD COLUMN can_upload INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE playlists ADD COLUMN cover TEXT',
    'ALTER TABLE playlists ADD COLUMN avatar TEXT',
    'ALTER TABLE playlists ADD COLUMN source TEXT',
    'ALTER TABLE playlists ADD COLUMN source_url TEXT',
    'ALTER TABLE users ADD COLUMN avatar TEXT',
    'ALTER TABLE users ADD COLUMN cover TEXT',
    'ALTER TABLE users ADD COLUMN status TEXT',
    'ALTER TABLE users ADD COLUMN status_color TEXT',
    'ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN avatar_frame TEXT',
    'ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT \'user\'',
    'ALTER TABLE tracks ADD COLUMN review_status TEXT NOT NULL DEFAULT \'pending\'',
    'ALTER TABLE tracks ADD COLUMN review_note TEXT',
    'ALTER TABLE tracks ADD COLUMN reviewed_by TEXT',
    'ALTER TABLE tracks ADD COLUMN reviewed_at INTEGER',
    'ALTER TABLE users ADD COLUMN search_text TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE users ADD COLUMN last_seen_at INTEGER',
    'ALTER TABLE chat_members ADD COLUMN typing_at INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE chat_members ADD COLUMN muted INTEGER NOT NULL DEFAULT 0',
  ]
  for (const sql of migrations) {
    try {
      db.exec(sql)
    } catch {
      /* column already exists */
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_tracks_review ON tracks(review_status, created_at)')
  // Search text is lowercased by JS so Cyrillic names are found regardless of case.
  const missingSearch = db
    .prepare("SELECT id, username, display_name FROM users WHERE search_text = ''")
    .all() as { id: string; username: string; display_name: string }[]
  for (const row of missingSearch) {
    db.prepare('UPDATE users SET search_text = ? WHERE id = ?').run(
      `${row.username} ${row.display_name}`.toLowerCase(),
      row.id,
    )
  }
  // One-time starting balance so the people who were here before the point
  // system existed can also try a premium frame. The marker row is written
  // even when there are no users yet, so accounts created later only get the
  // normal welcome bonus.
  const legacyGranted = db
    .prepare("SELECT value FROM meta WHERE key = 'legacy_points_v1'")
    .get()
  if (!legacyGranted) {
    const now = Date.now()
    const users = db.prepare('SELECT id FROM users').all() as { id: string }[]
    for (const user of users) {
      const inserted = db
        .prepare(
          `INSERT OR IGNORE INTO point_events (user_id, kind, amount, ref, created_at)
           VALUES (?, 'legacy', 500, 'legacy', ?)`,
        )
        .run(user.id, now)
      if (Number(inserted.changes) > 0) {
        db.prepare('UPDATE users SET points = points + 500 WHERE id = ?').run(user.id)
      }
    }
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_points_v1', '1')").run()
  }
  // The owner of the exclusive status gets it right away, without opening the
  // editor. The marker keeps a later personal choice from being overwritten.
  const bossStatusGranted = db
    .prepare("SELECT value FROM meta WHERE key = 'boss_status_v1'")
    .get()
  if (!bossStatusGranted) {
    db.prepare("UPDATE users SET status = 'boss', status_color = 'glass' WHERE username = 'stas'").run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('boss_status_v1', '1')").run()
  }
  // Existing tracks were published before moderation existed; keep them.
  const tracksReviewed = db
    .prepare("SELECT value FROM meta WHERE key = 'tracks_review_v1'")
    .get()
  if (!tracksReviewed) {
    db.prepare("UPDATE tracks SET review_status = 'approved'").run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('tracks_review_v1', '1')").run()
  }
  // Keep the legacy is_admin flag and the new role column in sync.
  db.prepare("UPDATE users SET role = 'admin' WHERE is_admin = 1 AND role <> 'admin'").run()
  // Codes are short-lived; drop leftovers so the tables stay small.
  db.exec('DELETE FROM email_verifications WHERE expires_at < ' + Date.now())
  db.exec('DELETE FROM password_resets WHERE expires_at < ' + Date.now())
  return db
}

export const db = globalForDb.__monahDb ?? createDb()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__monahDb = db
}
