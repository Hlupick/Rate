'use client'

import { useState } from 'react'
import { Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { requestStreakReturn } from './useStreak'

/**
 * Two-step action so a limited monthly return is never spent by accident.
 * The streak itself refreshes through the `monah:streak-changed` event.
 */
export function StreakReturnButton({
  returnsLeft,
  className,
}: {
  returnsLeft: number
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await requestStreakReturn()
      setArmed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось вернуть серию')
      window.dispatchEvent(new Event('monah:streak-changed'))
    } finally {
      setBusy(false)
    }
  }

  if (armed) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-amber-300 disabled:opacity-60"
          >
            <Undo2 size={12} />
            {busy ? 'Возвращаем…' : `Точно вернуть? Останется ${Math.max(0, returnsLeft - 1)}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setArmed(false)
              setError('')
            }}
            disabled={busy}
            className="rounded-full px-2 py-1.5 text-[11px] font-medium text-muted transition hover:text-ink disabled:opacity-60"
          >
            Отмена
          </button>
        </div>
        {error && <span className="text-[10.5px] leading-snug text-red-300">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      title={`Потратит 1 возврат, останется ${Math.max(0, returnsLeft - 1)}`}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/25',
        className,
      )}
    >
      <Undo2 size={12} />
      Вернуть серию
    </button>
  )
}
