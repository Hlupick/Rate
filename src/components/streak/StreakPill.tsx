'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import { formatDuration, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { StreakFlame, streakTextClass } from './StreakFlame'
import { StreakReturnButton } from './StreakReturnButton'
import { useStreak } from './useStreak'

/** Compact streak pill for the mobile top bar; tapping opens the details. */
export function StreakPill({ className }: { className?: string }) {
  const streak = useStreak()
  const [open, setOpen] = useState(false)

  const current = streak?.current ?? 0
  const atRisk = streak?.canReturn ? streak.atRisk : 0
  const days = current > 0 ? current : atRisk
  const underThreat = current < 1 && atRisk > 0
  const goal = streak?.goal ?? 30 * 60
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
          underThreat && 'ring-1 ring-inset ring-amber-400/40',
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
        description="Слушайте 30 минут в день — огонёк будет расти."
      >
        <div className="flex items-center gap-4">
          <StreakFlame days={days} size={56} />
          <div>
            <div className={cn('text-3xl font-extrabold leading-none tabular-nums', streakTextClass(days))}>
              {days}
            </div>
            <div className={cn('mt-1 text-sm', underThreat ? 'text-amber-200' : 'text-muted')}>
              {plural(days, 'день', 'дня', 'дней')} {underThreat ? 'под угрозой' : 'подряд'}
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

        {streak && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Shield size={13} aria-hidden />
                Возвраты в этом месяце
              </span>
              <span className="font-semibold tabular-nums text-amber-100">
                {streak.returnsLeft} из {streak.returnsLimit}
              </span>
            </div>
            {underThreat && (
              <>
                <p className="mt-2 text-[11px] leading-snug text-amber-100/90">
                  Вчерашний день пропущен. Вернуть серию можно до конца дня, потратив один возврат.
                </p>
                <StreakReturnButton returnsLeft={streak.returnsLeft} className="mt-2 w-full" />
              </>
            )}
          </div>
        )}

        {streak && streak.best > 0 && (
          <p className="mt-4 text-xs text-dim">
            Рекорд: {streak.best} {plural(streak.best, 'день', 'дня', 'дней')}
          </p>
        )}

        <ul className="mt-5 space-y-2 text-xs text-muted">
          <li>· 30 минут прослушивания закрывают день и продлевают серию.</li>
          <li>· Пропущенный день можно вернуть в течение следующих 24 часов.</li>
          <li>· На возвраты даётся 5 штук в месяц, один возврат — один день.</li>
          <li>· Не вернули вовремя — серия начинается заново.</li>
          <li>· На 10, 30, 50, 100 днях и дальше каждые 50 огонь вспыхивает ярче.</li>
        </ul>
      </Modal>
    </>
  )
}
