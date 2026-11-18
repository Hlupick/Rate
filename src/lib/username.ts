/** Public username rules: short, lowercase and free of separators. */
export const USERNAME_MIN_LENGTH = 5
export const USERNAME_MAX_LENGTH = 14
export const USERNAME_RE = /^[a-z0-9]{5,14}$/

/**
 * Names that must never be registered. `stas` belongs to the owner and stays
 * reserved even if that account is ever removed; the rest keep people from
 * pretending to be staff.
 */
export const RESERVED_USERNAMES = new Set([
  'stas',
  'admin',
  'support',
  'help',
  'rate',
  'ratemusic',
  'official',
  'moderator',
  'root',
  'system',
])

export type UsernameCheck = { ok: true; username: string } | { ok: false; error: string }

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** Pure format check used by both the form and the API. */
export function checkUsernameFormat(value: string): UsernameCheck {
  const username = normalizeUsername(value)
  if (username.length === 0) return { ok: false, error: 'Введите имя пользователя' }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: 'Этот ник зарезервирован' }
  }
  if (!/^[a-z0-9]+$/.test(username)) {
    return { ok: false, error: 'Только латинские буквы и цифры, без пробелов и знаков' }
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: `Минимум ${USERNAME_MIN_LENGTH} символов` }
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Максимум ${USERNAME_MAX_LENGTH} символов` }
  }
  return { ok: true, username }
}
