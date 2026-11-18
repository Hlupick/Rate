/** Short label shown next to the display name on the profile page. */
export const STATUS_MAX_LENGTH = 15

/**
 * Fixed palette for the status bubble. Classes are written out in full so
 * Tailwind keeps them; values are never taken from the client as raw CSS.
 * Every entry keeps a dark base (black/45) so the white text stays readable
 * on bright covers, while the tint only shifts the colour of the bubble.
 */
export const STATUS_COLORS = [
  {
    key: 'glass',
    label: 'Стекло',
    pill: 'border-white/15 bg-black/45',
    dot: 'bg-gradient-to-br from-white/80 to-white/25',
    icon: 'text-white/60',
  },
  {
    key: 'lavender',
    label: 'Лаванда',
    pill: 'border-violet-300/35 bg-gradient-to-r from-violet-500/40 via-violet-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-violet-300 to-violet-600',
    icon: 'text-violet-200',
  },
  {
    key: 'mint',
    label: 'Мята',
    pill: 'border-emerald-300/35 bg-gradient-to-r from-emerald-500/40 via-emerald-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-emerald-300 to-emerald-600',
    icon: 'text-emerald-200',
  },
  {
    key: 'sky',
    label: 'Небо',
    pill: 'border-sky-300/35 bg-gradient-to-r from-sky-500/40 via-sky-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-sky-300 to-sky-600',
    icon: 'text-sky-200',
  },
  {
    key: 'ocean',
    label: 'Океан',
    pill: 'border-blue-400/40 bg-gradient-to-r from-blue-600/45 via-blue-600/15 to-black/45',
    dot: 'bg-gradient-to-br from-blue-300 to-blue-700',
    icon: 'text-blue-200',
  },
  {
    key: 'sunset',
    label: 'Закат',
    pill: 'border-orange-300/40 bg-gradient-to-r from-orange-500/45 via-orange-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-orange-300 to-orange-600',
    icon: 'text-orange-200',
  },
  {
    key: 'rose',
    label: 'Роза',
    pill: 'border-rose-300/35 bg-gradient-to-r from-rose-500/40 via-rose-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-rose-300 to-rose-600',
    icon: 'text-rose-200',
  },
  {
    key: 'lime',
    label: 'Лайм',
    pill: 'border-lime-300/35 bg-gradient-to-r from-lime-500/40 via-lime-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-lime-300 to-lime-600',
    icon: 'text-lime-200',
  },
  {
    key: 'gold',
    label: 'Золото',
    pill: 'border-amber-300/40 bg-gradient-to-r from-amber-500/45 via-amber-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-amber-200 to-amber-500',
    icon: 'text-amber-200',
  },
] as const

export type StatusColor = (typeof STATUS_COLORS)[number]['key']

export const DEFAULT_STATUS_COLOR: StatusColor = 'glass'

export function statusColorTheme(value: string | null | undefined) {
  return STATUS_COLORS.find((color) => color.key === value) ?? STATUS_COLORS[0]
}

/** Any unknown value falls back to the glass look instead of failing the save. */
export function clampStatusColor(value: unknown): StatusColor {
  return STATUS_COLORS.some((color) => color.key === value)
    ? (value as StatusColor)
    : DEFAULT_STATUS_COLOR
}

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
