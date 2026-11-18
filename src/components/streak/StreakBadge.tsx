'use client'

import { formatDuration, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StreakFlame, streakTextClass, streakTier } from './StreakFlame'
import { useStreak } from './useStreak'

/** Sidebar card: flame, streak length and today's progress to the minute. */
export function StreakBadge({ className }: { className?: string }) {
  const streak = useStreak()
  const days = streak?.current ?? 0
  const goal = streak?.goal ?? 60
  const todaySeconds = streak?.todaySeconds ?? 0
  const done = todaySeconds >= goal
  const percent = Math.min(100, Math.round((todaySeconds / goal) * 100))
  const tier = streakTier(days)

  return (
    <div className={cn('rounded-lg bg-panel px-3 py-3', className)}>
      <div className="flex items-center gap-3">
        <StreakFlame days={days} size={30} className={streak ? undefined : 'opacity-40'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-[22px] font-extrabold leading-none tabular-nums',
                streakTextClass(days),
              )}
            >
              {streak ? days : '—'}
            </span>
            <span className="text-[11px] text-muted">
              {plural(days, 'день', 'дня', 'дней')} подряд
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-dim">
            <span>{done ? 'Сегодня продлено' : 'Слушайте 1 минуту в день'}</span>
            <span className="tabular-nums">
              {formatDuration(Math.min(todaySeconds, goal))} / {formatDuration(goal)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
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

      {tier >= 2 && (
        <p className="mt-2 text-[10.5px] text-amber-200/80">
          {tier >= 5
            ? 'Легендарная серия — так держать!'
            : tier >= 4
              ? 'Огонь полыхает: ещё немного до легенды'
              : tier >= 3
                ? 'Месяц подряд — огонь не гаснет'
                : 'Двузначная серия!'}
        </p>
      )}
      {streak && streak.best > days && (
        <p className="mt-1 text-[10.5px] text-dim">Рекорд: {streak.best}</p>
      )}
    </div>
  )
}
