'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

/** Chat link with the total unread badge, refreshed periodically. */
export function ChatUnreadLink() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true

    async function refresh() {
      if (document.visibilityState === 'hidden') return
      try {
        const response = await fetch('/api/chats/unread')
        if (!response.ok) return
        const data = (await response.json()) as { unread?: number }
        if (active) setUnread(Number(data.unread ?? 0))
      } catch {
        /* offline: keep the last value */
      }
    }

    void refresh()
    const timer = setInterval(() => void refresh(), 30_000)
    const onEvent = () => void refresh()
    window.addEventListener('monah:chats', onEvent)
    document.addEventListener('visibilitychange', onEvent)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('monah:chats', onEvent)
      document.removeEventListener('visibilitychange', onEvent)
    }
  }, [])

  return (
    <Link
      href="/chats"
      title="Сообщения"
      aria-label={unread > 0 ? `Сообщения, непрочитанных: ${unread}` : 'Сообщения'}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-muted transition hover:bg-black/70 hover:text-ink"
    >
      <MessageCircle size={17} />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-black">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
