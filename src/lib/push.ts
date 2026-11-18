import 'server-only'
import * as webpush from 'web-push'
import { db } from './db'
import { getPresence } from './presence'

type Row = Record<string, any>

export type PushCategory = 'messages' | 'social'

export type PushPayload = {
  title: string
  body: string
  url: string
  tag?: string
  category?: PushCategory
}

export type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

let configured: boolean | null = null

function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const publicKey = (process.env.VAPID_PUBLIC_KEY ?? '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? '').trim()
  if (!publicKey || !privateKey) {
    configured = false
    return configured
  }
  webpush.setVapidDetails(
    (process.env.VAPID_SUBJECT ?? 'mailto:no-reply@ratemusic.space').trim(),
    publicKey,
    privateKey,
  )
  configured = true
  return configured
}

export function pushConfigured(): boolean {
  return ensureConfigured()
}

export function pushPublicKey(): string | null {
  if (!ensureConfigured()) return null
  return (process.env.VAPID_PUBLIC_KEY ?? '').trim() || null
}

export function getPushPrefs(userId: string): { messages: boolean; social: boolean } {
  const row = db
    .prepare('SELECT messages, social FROM push_prefs WHERE user_id = ?')
    .get(userId) as Row | undefined
  return {
    messages: row ? Number(row.messages ?? 1) === 1 : true,
    social: row ? Number(row.social ?? 1) === 1 : true,
  }
}

export function setPushPrefs(
  userId: string,
  patch: { messages?: boolean; social?: boolean },
): { messages: boolean; social: boolean } {
  const current = getPushPrefs(userId)
  const next = {
    messages: patch.messages ?? current.messages,
    social: patch.social ?? current.social,
  }
  db.prepare(
    `INSERT INTO push_prefs (user_id, messages, social) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE
       SET messages = excluded.messages, social = excluded.social`,
  ).run(userId, next.messages ? 1 : 0, next.social ? 1 : 0)
  return next
}

export function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent: string | null,
): void {
  const now = Date.now()
  db.prepare(
    `INSERT INTO push_subscriptions
       (user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           user_agent = excluded.user_agent,
           last_used_at = excluded.last_used_at`,
  ).run(
    userId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    userAgent,
    now,
    now,
  )
}

export function removePushSubscription(userId: string, endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(
    userId,
    endpoint,
  )
}

type SendOptions = {
  ignorePrefs?: boolean
  skipIfOnline?: boolean
}

/** Sends one notification to every browser the user subscribed. */
export async function sendPushToUser(
  userId: string,
  category: PushCategory,
  payload: PushPayload,
  options: SendOptions = {},
): Promise<number> {
  if (!ensureConfigured()) return 0
  if (!options.ignorePrefs) {
    const prefs = getPushPrefs(userId)
    if (!prefs[category]) return 0
  }
  if (options.skipIfOnline && getPresence(userId).online) return 0

  const rows = db
    .prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
    .all(userId) as Row[]
  if (rows.length === 0) return 0

  let sent = 0
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: String(row.endpoint),
            keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
          },
          JSON.stringify({ ...payload, category }),
          { TTL: 3600 },
        )
        sent += 1
        db.prepare('UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?').run(
          Date.now(),
          Number(row.id),
        )
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode ?? 0)
        if (status === 404 || status === 410) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(Number(row.id))
        } else {
          console.error('[push] send failed:', status || error)
        }
      }
    }),
  )
  return sent
}
