'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Volume2, VolumeX } from 'lucide-react'
import { isSoundEnabled, setSoundEnabled, unlockNotificationSound } from '@/lib/notify-sound'
import { cn } from '@/lib/utils'

const SYSTEM_KEY = 'rate:chat-system'

function systemAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  )
}

/** Global notification preferences: system notifications and sound. */
export function ChatSettings() {
  const [open, setOpen] = useState(false)
  const [sound, setSound] = useState(true)
  const [system, setSystem] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSound(isSoundEnabled())
    try {
      setSystem(window.localStorage.getItem(SYSTEM_KEY) === 'on' && systemAllowed())
    } catch {
      setSystem(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggleSound() {
    const next = !sound
    unlockNotificationSound()
    setSoundEnabled(next)
    setSound(next)
  }

  async function toggleSystem() {
    setError('')
    if (system) {
      setSystem(false)
      try {
        window.localStorage.setItem(SYSTEM_KEY, 'off')
      } catch {
        /* no-op */
      }
      return
    }
    if (!('Notification' in window)) {
      setError('Браузер не поддерживает системные уведомления.')
      return
    }
    let permission = window.Notification.permission
    if (permission === 'default') permission = await window.Notification.requestPermission()
    if (permission !== 'granted') {
      setError('Разрешение не выдано. Включите уведомления в настройках браузера.')
      return
    }
    setSystem(true)
    try {
      window.localStorage.setItem(SYSTEM_KEY, 'on')
    } catch {
      /* no-op */
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Настройки уведомлений"
        aria-expanded={open}
        title="Настройки уведомлений"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-ink"
      >
        <Bell size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-line bg-[#1b1b1b] p-3 shadow-2xl">
          <p className="text-xs font-semibold text-ink">Уведомления</p>

          <button
            type="button"
            onClick={toggleSound}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
          >
            <span className="inline-flex items-center gap-2 text-[12px] text-muted">
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
              Звук уведомлений
            </span>
            <span
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition',
                sound ? 'bg-accent' : 'bg-white/15',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                  sound ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() => void toggleSystem()}
            className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
          >
            <span className="inline-flex items-center gap-2 text-[12px] text-muted">
              <Bell size={14} />
              Системные уведомления
            </span>
            <span
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition',
                system ? 'bg-accent' : 'bg-white/15',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                  system ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          <p className="mt-2 text-[10.5px] leading-snug text-dim">
            Эти уведомления работают, пока сайт открыт. Звук настраивается отдельно на этом
            устройстве.
          </p>
          <Link
            href="/settings#notifications"
            onClick={() => setOpen(false)}
            className="mt-2 block text-[11px] font-medium text-amber-200 transition hover:text-amber-100"
          >
            Фоновые push-уведомления →
          </Link>
          {error && <p className="mt-1.5 text-[10.5px] leading-snug text-amber-300">{error}</p>}
        </div>
      )}
    </div>
  )
}
