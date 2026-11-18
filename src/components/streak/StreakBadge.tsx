'use client'

import { Shield } from 'lucide-react'
import { formatDuration, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StreakFlame, streakTextClass, streakTier } from './StreakFlame'
import { StreakReturnButton } from './StreakReturnButton'
import { useStreak } from './useStreak'

/** Sidebar card: flame, streak length and today's progress to the minute. */
export function StreakBadge({ className }: { className?: string }) {
  const streak = useStreak()
  const current = streak?.current ?? 0
  const atRisk = streak?.canReturn ? streak.atRisk : 0
  const days = current > 0 ? current : atRisk
  const underThreat = current < 1 && atRisk > 0
  const goal = streak?.goal ?? 30 * 60
  const todaySeconds = streak?.todaySeconds ?? 0
  const done = todaySeconds >= goal
  const percent = Math.min(100, Math.round((todaySeconds / goal) * 100))
  const tier = streakTier(days)

  return (
    <div className={cn('rounded-lg bg-panel px-3 py-3', className)}>
      <div className="flex items-center gap-3">
        <StreakFlame
          days={days}
          size={30}
          className={cn(streak ? undefined : 'opacity-40', underThreat && 'opacity-80')}
        />
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
            <span className={cn('text-[11px]', underThreat ? 'text-amber-200' : 'text-muted')}>
              {underThreat
                ? `${plural(days, 'день', 'дня', 'дней')} под угрозой`
                : `${plural(days, 'день', 'дня', 'дней')} подряд`}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-dim">
            <span>{done ? 'Сегодня продлено' : 'Слушайте 30 минут в день'}</span>
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

      {streak && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-dim">
          <span className="inline-flex items-center gap-1">
            <Shield size={10} aria-hidden />
            Возвраты
          </span>
          <span className="tabular-nums">
            {streak.returnsLeft} из {streak.returnsLimit}
          </span>
        </div>
      )}

      {underThreat && streak && (
        <div className="mt-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[10.5px] leading-snug text-amber-100/90">
            Вчерашний день пропущен. Верните серию до конца дня — иначе она начнётся заново.
          </p>
          <StreakReturnButton returnsLeft={streak.returnsLeft} className="mt-2 w-full" />
        </div>
      )}

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
