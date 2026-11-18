/**
 * Frames drawn around avatars. Five are free, four cost points earned by
 * listening and uploading. Keys are the only thing stored in the database;
 * CSS class names live here so the client can never inject its own styles.
 */
export const AVATAR_FRAMES = [
  { key: 'none', label: 'Без ободка', tier: 'free', price: 0, className: '' },
  { key: 'frost', label: 'Иней', tier: 'free', price: 0, className: 'frame-frost' },
  { key: 'mint', label: 'Мята', tier: 'free', price: 0, className: 'frame-mint' },
  { key: 'ocean', label: 'Океан', tier: 'free', price: 0, className: 'frame-ocean' },
  { key: 'ember', label: 'Уголь', tier: 'free', price: 0, className: 'frame-ember' },
  { key: 'mono', label: 'Графит', tier: 'free', price: 0, className: 'frame-mono' },
  { key: 'aurora', label: 'Аврора', tier: 'premium', price: 600, className: 'frame-aurora' },
  { key: 'neon', label: 'Неон', tier: 'premium', price: 900, className: 'frame-neon' },
  { key: 'gold', label: 'Золото', tier: 'premium', price: 1200, className: 'frame-gold' },
  { key: 'prism', label: 'Призма', tier: 'premium', price: 1800, className: 'frame-prism' },
] as const

export type AvatarFrame = (typeof AVATAR_FRAMES)[number]['key']

export const DEFAULT_AVATAR_FRAME: AvatarFrame = 'none'

export function avatarFrameTheme(value: string | null | undefined) {
  return AVATAR_FRAMES.find((frame) => frame.key === value) ?? AVATAR_FRAMES[0]
}

/** Any unknown value falls back to "no frame" instead of failing the save. */
export function clampAvatarFrame(value: unknown): AvatarFrame {
  return AVATAR_FRAMES.some((frame) => frame.key === value)
    ? (value as AvatarFrame)
    : DEFAULT_AVATAR_FRAME
}

export function frameClassName(value: string | null | undefined): string {
  return avatarFrameTheme(value).className
}

export function isPremiumFrame(value: string | null | undefined): boolean {
  return avatarFrameTheme(value).tier === 'premium'
}

export function framePrice(value: string | null | undefined): number {
  return avatarFrameTheme(value).price
}
