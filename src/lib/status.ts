/**
 * A short status is shown next to the display name on the profile page.
 * Only the ready-made list below can be picked; the database stores the key.
 */
export const STATUS_PRESETS = [
  { key: 'max', label: 'На максималках' },
  { key: 'rhythm', label: 'В своём ритме' },
  { key: 'pause', label: 'Без паузы' },
  { key: 'repeat', label: 'На репите' },
  { key: 'genre', label: 'Вне жанра' },
  { key: 'sound', label: 'Свой звук' },
  { key: 'night', label: 'Ночной режим' },
  { key: 'wave', label: 'На другой волне' },
  { key: 'quiet', label: 'Тише, я слушаю' },
  { key: 'hit', label: 'В ударе' },
  { key: 'nonformat', label: 'Неформат' },
  { key: 'flight', label: 'Свободный полёт' },
  // One-off status drawn with an animated gradient and bolts. Owners below.
  { key: 'boss', label: 'ПРОСТО БОСС', exclusive: true },
] as const

export type StatusPreset = (typeof STATUS_PRESETS)[number]
export type StatusKey = StatusPreset['key']

/**
 * Statuses that belong to one person only. The server checks this list as well,
 * so hiding the card in the editor is not the only line of defence.
 */
export const EXCLUSIVE_STATUS_OWNERS: Partial<Record<StatusKey, readonly string[]>> = {
  boss: ['stas'],
}

/** Finds a status by its stored key. */
export function statusByKey(value: string | null | undefined): StatusPreset | undefined {
  return STATUS_PRESETS.find((status) => status.key === value)
}

/**
 * Resolves both the new keys and labels written before the catalogue existed,
 * so an old profile keeps showing its status until the owner picks a new one.
 */
export function resolveStatus(value: string | null | undefined): StatusPreset | undefined {
  if (!value) return undefined
  return (
    statusByKey(value) ?? STATUS_PRESETS.find((status) => status.label === value.trim())
  )
}

/** True only for the listed owner of an exclusive status, e.g. @stas and «ПРОСТО БОСС». */
export function canUseExclusiveStatus(
  value: string | null | undefined,
  username: string | null | undefined,
): boolean {
  const status = statusByKey(value)
  if (!status || !('exclusive' in status) || !username) return false
  const owners = EXCLUSIVE_STATUS_OWNERS[status.key]
  return Boolean(owners?.includes(username.trim().toLowerCase()))
}

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
  },
  {
    key: 'lavender',
    label: 'Лаванда',
    pill: 'border-violet-300/35 bg-gradient-to-r from-violet-500/40 via-violet-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-violet-300 to-violet-600',
  },
  {
    key: 'mint',
    label: 'Мята',
    pill: 'border-emerald-300/35 bg-gradient-to-r from-emerald-500/40 via-emerald-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-emerald-300 to-emerald-600',
  },
  {
    key: 'sky',
    label: 'Небо',
    pill: 'border-sky-300/35 bg-gradient-to-r from-sky-500/40 via-sky-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-sky-300 to-sky-600',
  },
  {
    key: 'ocean',
    label: 'Океан',
    pill: 'border-blue-400/40 bg-gradient-to-r from-blue-600/45 via-blue-600/15 to-black/45',
    dot: 'bg-gradient-to-br from-blue-300 to-blue-700',
  },
  {
    key: 'sunset',
    label: 'Закат',
    pill: 'border-orange-300/40 bg-gradient-to-r from-orange-500/45 via-orange-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-orange-300 to-orange-600',
  },
  {
    key: 'rose',
    label: 'Роза',
    pill: 'border-rose-300/35 bg-gradient-to-r from-rose-500/40 via-rose-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-rose-300 to-rose-600',
  },
  {
    key: 'lime',
    label: 'Лайм',
    pill: 'border-lime-300/35 bg-gradient-to-r from-lime-500/40 via-lime-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-lime-300 to-lime-600',
  },
  {
    key: 'gold',
    label: 'Золото',
    pill: 'border-amber-300/40 bg-gradient-to-r from-amber-500/45 via-amber-500/15 to-black/45',
    dot: 'bg-gradient-to-br from-amber-200 to-amber-500',
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
