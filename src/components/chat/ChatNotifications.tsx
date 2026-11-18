'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { isSoundEnabled, playNotificationTone, unlockNotificationSound } from '@/lib/notify-sound'
import type { ChatNotification } from '@/lib/chat'

type Toast = ChatNotification & { key: number }

const SYSTEM_KEY = 'rate:chat-system'

function systemEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  try {
    return (
      window.Notification.permission === 'granted' &&
      window.localStorage.getItem(SYSTEM_KEY) === 'on'
    )
  } catch {
    return false
  }
}

/** In-app toasts and optional system notifications for new friend messages. */
export function ChatNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const afterRef = useRef(0)
  const bootedRef = useRef(false)
  const seenRef = useRef(new Set<number>())

  function dismiss(key: number) {
    setToasts((current) => current.filter((toast) => toast.key !== key))
  }

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    function showSystem(item: ChatNotification) {
      try {
        const notification = new Notification(`${item.displayName} · Rate`, {
          body: item.body.slice(0, 160),
          tag: `rate-chat-${item.username}`,
        })
        notification.onclick = () => {
          window.focus()
          window.location.href = `/chats?with=${encodeURIComponent(item.username)}`
          notification.close()
        }
      } catch {
        /* permission revoked */
      }
    }

    async function poll(initial = false) {
      try {
        const response = await fetch(
          `/api/chats/notifications?after=${initial ? 0 : afterRef.current}`,
        )
        if (!response.ok) return
        const data = (await response.json()) as {
          items?: ChatNotification[]
          latest?: number
        }
        if (!active) return

        if (initial) {
          afterRef.current = Number(data.latest ?? 0)
          bootedRef.current = true
          return
        }

        afterRef.current = Math.max(afterRef.current, Number(data.latest ?? 0))
        const items = (data.items ?? []).filter((item) => !seenRef.current.has(item.id))
        if (items.length === 0) return
        for (const item of items) seenRef.current.add(item.id)
        window.dispatchEvent(new Event('monah:chats'))

        const hidden = document.visibilityState === 'hidden'
        if (hidden && systemEnabled()) {
          for (const item of items.slice(-3)) showSystem(item)
          return
        }

        if (!hidden && isSoundEnabled()) playNotificationTone()
        const fresh = items.slice(-3).map((item) => ({ ...item, key: item.id }))
        setToasts((current) => [...fresh, ...current].slice(0, 3))
        for (const item of fresh) {
          window.setTimeout(() => dismiss(item.key), 6500)
        }
      } catch {
        /* keep polling quietly */
      }
    }

    const unlock = () => unlockNotificationSound()
    window.addEventListener('pointerdown', unlock, { once: true })
    void poll(true)
    timer = setInterval(() => {
      if (bootedRef.current) void poll(false)
    }, 15_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && bootedRef.current) void poll(false)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', unlock)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-36 right-3 z-[60] flex w-[320px] max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:bottom-24 sm:right-4">
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className="pointer-events-auto flex items-start gap-2 rounded-xl border border-white/10 bg-[#181818]/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <Link
            href={`/chats?with=${encodeURIComponent(toast.username)}`}
            className="flex min-w-0 flex-1 items-start gap-2.5"
          >
            <Avatar
              name={toast.displayName}
              src={toast.avatar}
              frame={toast.avatarFrame}
              className="h-9 w-9 shrink-0"
              textClassName="text-[10px]"
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink">
                {toast.displayName}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted">
                {toast.body}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => dismiss(toast.key)}
            aria-label="Закрыть уведомление"
            className="shrink-0 rounded-full p-1 text-dim transition hover:bg-white/5 hover:text-ink"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
