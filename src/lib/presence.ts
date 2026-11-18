import { db } from './db'

type Row = Record<string, any>

/** Considered online while activity happened within this window. */
export const PRESENCE_ONLINE_MS = 2 * 60_000

export type Presence = {
  online: boolean
  lastSeenAt: number
}

export function touchPresence(userId: string): number {
  const now = Date.now()
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, userId)
  return now
}

export function getPresence(userId: string): Presence {
  const row = db.prepare('SELECT last_seen_at FROM users WHERE id = ?').get(userId) as
    | Row
    | undefined
  const lastSeenAt = Number(row?.last_seen_at ?? 0)
  return {
    lastSeenAt,
    online: lastSeenAt > 0 && Date.now() - lastSeenAt < PRESENCE_ONLINE_MS,
  }
}

export function getPresenceByUsername(username: string): Presence | null {
  const row = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = ?')
    .get(username.trim().toLowerCase()) as Row | undefined
  return row ? getPresence(String(row.id)) : null
}
