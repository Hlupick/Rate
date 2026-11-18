'use client'

import { daysWord } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StreakFlame, streakTextClass } from './StreakFlame'
import { useStreak } from './useStreak'

/**
 * Compact "🔥 12" marker shown next to a nickname. Hidden while the listener
 * has no streak yet, so new accounts don't show a grey zero everywhere.
 */
export function StreakChip({
  username,
  className,
  variant = 'default',
}: {
  username: string
  className?: string
  /** `glass` keeps the chip readable on top of cover artwork. */
  variant?: 'default' | 'glass'
}) {
  const streak = useStreak(username)
  const current = streak?.current ?? 0
  const atRisk = streak?.canReturn ? streak.atRisk : 0
  const days = current > 0 ? current : atRisk
  if (!streak || days < 1) return null

  const underThreat = current < 1 && atRisk > 0
  const title = underThreat
    ? `Серия под угрозой: ${daysWord(days)}. Верните до конца дня`
    : `Серия прослушиваний: ${daysWord(days)}`

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-[1px] text-[11px] font-semibold leading-[1.4] tabular-nums',
        underThreat ? 'border-amber-400/40' : 'border-white/10',
        variant === 'glass' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/[0.06]',
        streakTextClass(days),
        className,
      )}
    >
      <StreakFlame days={days} size={12} />
      {days}
    </span>
  )
}
