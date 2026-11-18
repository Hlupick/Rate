'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  LISTENING_POINTS_DAILY_CAP,
  POINTS_PER_LISTENING_MINUTE,
  UPLOAD_POINTS,
  UPLOAD_POINTS_DAILY_CAP,
  WELCOME_POINTS,
} from '@/lib/points-config'

const TRACKS_PER_DAY = Math.floor(UPLOAD_POINTS_DAILY_CAP / UPLOAD_POINTS)

/** Small "?" next to the point balance with the earning rules. */
export function PointsHint({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span
      ref={rootRef}
      className="relative inline-flex items-center gap-1.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <button
        type="button"
        aria-label="Как заработать баллы"
        aria-expanded={open}
        aria-describedby={open ? 'points-hint' : undefined}
        title="Как заработать баллы"
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) {
            setOpen(false)
          }
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/40 text-muted backdrop-blur-md transition hover:border-white/30 hover:text-ink"
      >
        <HelpCircle size={14} aria-hidden />
      </button>

      {open && (
        <span
          id="points-hint"
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 block w-[286px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#151515]/95 p-3.5 text-left shadow-2xl backdrop-blur-xl"
        >
          <span className="block text-xs font-semibold text-ink">Как заработать баллы</span>
          <span className="mt-2 block text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-ink/85">Прослушивание:</span>{' '}
            {POINTS_PER_LISTENING_MINUTE} балл за минуту, до {LISTENING_POINTS_DAILY_CAP} баллов в
            день.
          </span>
          <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-ink/85">Загрузка:</span> {UPLOAD_POINTS} баллов за
            трек, до {TRACKS_PER_DAY} треков в день.
          </span>
          <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-ink/85">Новым аккаунтам:</span> {WELCOME_POINTS}{' '}
            баллов сразу.
          </span>
          <span className="mt-2.5 block border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-muted">
            Баллы тратятся на премиум-ободки. Купленный ободок остаётся навсегда.
          </span>
        </span>
      )}
    </span>
  )
}
