import 'server-only'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const CODE_TTL_MS = 10 * 60_000
export const MAX_CODE_ATTEMPTS = 5
export const RESEND_COOLDOWN_MS = 60_000
export const CODE_RE = /^\d{6}$/

function secret(): string {
  return (process.env.AUTH_SECRET ?? '').trim() || 'monah-local-dev-secret-change-me'
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Codes are stored hashed: a leaked database row must not reveal a working code. */
export function hashCode(code: string): string {
  return createHmac('sha256', secret()).update(code.trim()).digest('hex')
}

export function codeMatches(code: string, storedHash: string): boolean {
  const left = Buffer.from(hashCode(code), 'hex')
  const right = Buffer.from(storedHash, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}
