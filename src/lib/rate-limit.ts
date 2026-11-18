/**
 * Simple in-process rate limiter. Good enough for a single-container deployment:
 * the app runs as one Node process behind Caddy.
 */
type Bucket = { count: number; reset: number }

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    if (buckets.size > MAX_KEYS) {
      for (const [k, value] of buckets) {
        if (value.reset <= now) buckets.delete(k)
      }
    }
    return { ok: true, retryAfter: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'local'
}
