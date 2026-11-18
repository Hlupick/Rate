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
  if (!streak || streak.current < 1) return null

  return (
    <span
      title={`Серия прослушиваний: ${daysWord(streak.current)}`}
      aria-label={`Серия прослушиваний: ${daysWord(streak.current)}`}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-white/10 px-1.5 py-[1px] text-[11px] font-semibold leading-[1.4] tabular-nums',
        variant === 'glass' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/[0.06]',
        streakTextClass(streak.current),
        className,
      )}
    >
      <StreakFlame days={streak.current} size={12} />
      {streak.current}
    </span>
  )
}
