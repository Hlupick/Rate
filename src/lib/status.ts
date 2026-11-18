/** Short label shown next to the display name on the profile page. */
export const STATUS_MAX_LENGTH = 15

/** Counts user-perceived characters so one emoji takes one slot. */
export function countStatusChars(value: string): number {
  return Array.from(value).length
}

/** Keeps typing intact (spaces included) while never letting the text grow past the limit. */
export function limitStatusChars(value: string, limit = STATUS_MAX_LENGTH): string {
  const chars = Array.from(value)
  return chars.length <= limit ? value : chars.slice(0, limit).join('')
}

/** Collapses whitespace, drops control characters and cuts to the limit. */
export function clampStatus(value: string, limit = STATUS_MAX_LENGTH): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(cleaned).slice(0, limit).join('').trim()
}
