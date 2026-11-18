import { db } from './db'
import {
  LISTENING_POINTS_DAILY_CAP,
  POINTS_PER_LISTENING_MINUTE,
  UPLOAD_POINTS,
  UPLOAD_POINTS_DAILY_CAP,
} from './points-config'

export {
  LISTENING_POINTS_DAILY_CAP,
  POINTS_PER_LISTENING_MINUTE,
  UPLOAD_POINTS,
  UPLOAD_POINTS_DAILY_CAP,
  WELCOME_POINTS,
} from './points-config'

type Row = Record<string, any>

export function getUserPoints(userId: string): number {
  const row = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as Row | undefined
  return Number(row?.points ?? 0)
}

/**
 * Adds points once per (kind, ref). The unique index makes repeated pings or
 * double-clicked purchases harmless; the balance only moves when the ledger
 * row is actually inserted.
 */
export function grantPoints(userId: string, kind: string, amount: number, ref: string): number {
  if (amount === 0) return getUserPoints(userId)
  const inserted = db
    .prepare(
      `INSERT OR IGNORE INTO point_events (user_id, kind, amount, ref, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, kind, amount, ref, Date.now())
  if (Number(inserted.changes) > 0) {
    db.prepare('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?').run(amount, userId)
  }
  return getUserPoints(userId)
}

/**
 * Listening arrives in one-minute pings. Seconds are accumulated per day so
 * rounding never eats a listener's progress, and points are credited only
 * when a whole minute is reached.
 */
export function addListeningPoints(userId: string, day: string, seconds: number): number {
  const value = Math.max(0, Math.min(Math.floor(seconds), 120))
  if (value === 0) return getUserPoints(userId)

  db.exec('BEGIN IMMEDIATE')
  try {
    const row = db
      .prepare('SELECT seconds, awarded FROM point_days WHERE user_id = ? AND day = ?')
      .get(userId, day) as Row | undefined
    const total = Number(row?.seconds ?? 0) + value
    const earned = Math.min(
      Math.floor(total / 60) * POINTS_PER_LISTENING_MINUTE,
      LISTENING_POINTS_DAILY_CAP,
    )
    const previouslyAwarded = Number(row?.awarded ?? 0)
    db.prepare(
      `INSERT INTO point_days (user_id, day, seconds, awarded) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, day) DO UPDATE
         SET seconds = excluded.seconds, awarded = excluded.awarded`,
    ).run(userId, day, total, Math.max(previouslyAwarded, earned))

    const delta = earned - previouslyAwarded
    if (delta > 0) {
      grantPoints(userId, 'listen', delta, `${day}:${earned}`)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getUserPoints(userId)
}

/** Uploads are rewarded per track, with a rolling 24-hour ceiling. */
export function addUploadPoints(userId: string, trackId: string): number {
  const since = Date.now() - 24 * 60 * 60_000
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM point_events
       WHERE user_id = ? AND kind = 'upload' AND created_at >= ?`,
    )
    .get(userId, since) as Row | undefined
  const alreadyEarned = Number(row?.total ?? 0)
  const remaining = Math.max(0, UPLOAD_POINTS_DAILY_CAP - alreadyEarned)
  const amount = Math.min(UPLOAD_POINTS, remaining)
  if (amount <= 0) return getUserPoints(userId)
  return grantPoints(userId, 'upload', amount, trackId)
}
