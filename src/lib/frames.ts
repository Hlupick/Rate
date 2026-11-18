import { AVATAR_FRAMES, clampAvatarFrame, framePrice, isPremiumFrame, type AvatarFrame } from './avatar-frame'
import { db } from './db'
import { getUserPoints } from './points'

type Row = Record<string, any>

export function getOwnedFrames(userId: string): AvatarFrame[] {
  const rows = db
    .prepare('SELECT frame FROM user_frames WHERE user_id = ?')
    .all(userId) as Row[]
  return rows.map((row) => clampAvatarFrame(String(row.frame)))
}

export function ownsFrame(userId: string, frame: AvatarFrame): boolean {
  if (!isPremiumFrame(frame)) return true
  return Boolean(
    db.prepare('SELECT 1 FROM user_frames WHERE user_id = ? AND frame = ?').get(userId, frame),
  )
}

export type BuyFrameResult = {
  ok: boolean
  error?: string
  frame?: AvatarFrame
  points: number
  owned: AvatarFrame[]
}

/**
 * Charges the frame price, records ownership and equips it in one
 * transaction. The balance check lives in the UPDATE itself, so two parallel
 * requests cannot spend the same points.
 */
export function buyFrame(userId: string, value: string): BuyFrameResult {
  const known = AVATAR_FRAMES.some((frame) => frame.key === value)
  if (!known) {
    return { ok: false, error: 'Такого ободка нет', points: getUserPoints(userId), owned: getOwnedFrames(userId) }
  }
  const frame = clampAvatarFrame(value)
  if (!isPremiumFrame(frame)) {
    return { ok: false, error: 'Этот ободок бесплатный', points: getUserPoints(userId), owned: getOwnedFrames(userId) }
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    const alreadyOwned = db
      .prepare('SELECT 1 FROM user_frames WHERE user_id = ? AND frame = ?')
      .get(userId, frame)
    if (alreadyOwned) {
      db.exec('COMMIT')
      return { ok: true, frame, points: getUserPoints(userId), owned: getOwnedFrames(userId) }
    }

    const price = framePrice(frame)
    const balance = getUserPoints(userId)
    if (balance < price) {
      db.exec('ROLLBACK')
      return {
        ok: false,
        error: `Не хватает ${price - balance} баллов`,
        points: balance,
        owned: getOwnedFrames(userId),
      }
    }

    const paid = db
      .prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
      .run(price, userId, price)
    if (Number(paid.changes) === 0) {
      db.exec('ROLLBACK')
      return {
        ok: false,
        error: 'Не хватает баллов',
        points: getUserPoints(userId),
        owned: getOwnedFrames(userId),
      }
    }

    db.prepare(
      'INSERT INTO user_frames (user_id, frame, price, acquired_at) VALUES (?, ?, ?, ?)',
    ).run(userId, frame, price, Date.now())
    db.prepare(
      `INSERT OR IGNORE INTO point_events (user_id, kind, amount, ref, created_at)
       VALUES (?, 'purchase', ?, ?, ?)`,
    ).run(userId, -price, frame, Date.now())
    db.prepare('UPDATE users SET avatar_frame = ? WHERE id = ?').run(frame, userId)
    db.exec('COMMIT')
    return { ok: true, frame, points: getUserPoints(userId), owned: getOwnedFrames(userId) }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
