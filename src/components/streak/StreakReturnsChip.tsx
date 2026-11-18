'use client'

import { Shield } from 'lucide-react'
import { StreakReturnButton } from './StreakReturnButton'
import { useStreak } from './useStreak'

/**
 * Monthly returns for the owner's own profile, so they are reachable on phones
 * where the sidebar card is hidden.
 */
export function StreakReturnsChip() {
  const streak = useStreak()
  if (!streak) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
      <span
        title="Один возврат спасает пропущенный вчерашний день в течение 24 часов. Всего 5 возвратов в месяц."
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md"
      >
        <Shield size={14} className="text-amber-300" aria-hidden />
        <span className="text-sm font-bold tabular-nums text-amber-100">
          {streak.returnsLeft}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-amber-200/70">
          из {streak.returnsLimit} возвратов
        </span>
      </span>
      {streak.canReturn && <StreakReturnButton returnsLeft={streak.returnsLeft} />}
    </div>
  )
}
