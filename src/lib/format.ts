export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTotalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 мин'
  const minutes = Math.round(seconds / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
  return `${m} мин`
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function tracksWord(n: number): string {
  return `${formatCount(n)} ${plural(n, 'трек', 'трека', 'треков')}`
}

export function artistsWord(n: number): string {
  return `${formatCount(n)} ${plural(n, 'исполнитель', 'исполнителя', 'исполнителей')}`
}

export function daysWord(n: number): string {
  return `${formatCount(n)} ${plural(n, 'день', 'дня', 'дней')}`
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 30) return `${days} дн назад`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес назад`
  return `${Math.floor(months / 12)} г назад`
}

export function coverUrl(cover: string | null | undefined): string | null {
  if (!cover) return null
  return `/api/covers/${encodeURIComponent(cover)}`
}

const GRADIENTS = [
  ['#2b2b2b', '#4a4a4a'],
  ['#262626', '#3d3d3d'],
  ['#303030', '#525252'],
  ['#232323', '#454545'],
  ['#333333', '#5a5a5a'],
  ['#1f1f1f', '#3a3a3a'],
]

export function fallbackGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  const [a, b] = GRADIENTS[hash % GRADIENTS.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}
