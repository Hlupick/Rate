'use client'

import { useState } from 'react'
import { formatDuration, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { StreakFlame, streakTextClass } from './StreakFlame'
import { useStreak } from './useStreak'

/** Compact streak pill for the mobile top bar; tapping opens the details. */
export function StreakPill({ className }: { className?: string }) {
  const streak = useStreak()
  const [open, setOpen] = useState(false)

  const days = streak?.current ?? 0
  const goal = streak?.goal ?? 60
  const todaySeconds = streak?.todaySeconds ?? 0
  const done = todaySeconds >= goal
  const percent = Math.min(100, Math.round((todaySeconds / goal) * 100))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Серия прослушиваний: ${days}. Открыть подробности`}
        className={cn(
          'flex h-10 items-center gap-1 rounded-full bg-black/50 px-2.5 text-sm font-semibold tabular-nums transition hover:bg-black/70',
          streakTextClass(days),
          className,
        )}
      >
        <StreakFlame days={days} size={17} />
        <span>{streak ? days : '—'}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Серия прослушиваний"
        description="Слушайте музыку хотя бы минуту в день — огонёк будет расти."
      >
        <div className="flex items-center gap-4">
          <StreakFlame days={days} size={56} />
          <div>
            <div className={cn('text-3xl font-extrabold leading-none tabular-nums', streakTextClass(days))}>
              {days}
            </div>
            <div className="mt-1 text-sm text-muted">
              {plural(days, 'день', 'дня', 'дней')} подряд
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{done ? 'Сегодня продлено ✓' : 'Сегодня'}</span>
            <span className="tabular-nums">
              {formatDuration(Math.min(todaySeconds, goal))} / {formatDuration(goal)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                done
                  ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300'
                  : 'bg-amber-500/70',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {streak && streak.best > 0 && (
          <p className="mt-4 text-xs text-dim">
            Рекорд: {streak.best} {plural(streak.best, 'день', 'дня', 'дней')}
          </p>
        )}

        <ul className="mt-5 space-y-2 text-xs text-muted">
          <li>· Минута прослушивания закрывает день и продлевает серию.</li>
          <li>· Пропущенный день обнуляет серию — огонёк потухнет.</li>
          <li>· На 10, 30, 50, 100 днях и дальше каждые 50 огонь вспыхивает ярче.</li>
        </ul>
      </Modal>
    </>
  )
}
