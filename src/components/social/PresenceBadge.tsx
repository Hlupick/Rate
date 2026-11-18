'use client'

import { useEffect, useState } from 'react'
import { timeAgo } from '@/lib/format'

/** Green dot and «В сети» / last visit, refreshed while the profile is open. */
export function PresenceBadge({
  username,
  initialLastSeenAt,
  initialOnline,
}: {
  username: string
  initialLastSeenAt: number
  initialOnline: boolean
}) {
  const [lastSeenAt, setLastSeenAt] = useState(initialLastSeenAt)
  const [online, setOnline] = useState(initialOnline)

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const response = await fetch(`/api/presence?user=${encodeURIComponent(username)}`)
        if (!response.ok) return
        const data = (await response.json()) as { lastSeenAt?: number; online?: boolean }
        if (!active) return
        setLastSeenAt(Number(data.lastSeenAt ?? 0))
        setOnline(Boolean(data.online))
      } catch {
        /* keep the last state */
      }
    }

    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 45_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [username])

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted"
      title={lastSeenAt > 0 ? `Последний визит ${timeAgo(lastSeenAt)}` : undefined}
    >
      <span
        className={
          online
            ? 'h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
            : 'h-2 w-2 rounded-full bg-white/20'
        }
      />
      {online ? 'В сети' : lastSeenAt > 0 ? `Последний визит ${timeAgo(lastSeenAt)}` : 'Ещё не заходил'}
    </span>
  )
}
