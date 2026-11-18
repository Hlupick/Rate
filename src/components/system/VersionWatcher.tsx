'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { BUILD_ID } from '@/lib/build'

/**
 * Watches the deployed build id. Safe moments reload the page automatically;
 * while music is playing or a form is open we ask instead of interrupting.
 */
export function VersionWatcher() {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (BUILD_ID === 'dev') return
    let cancelled = false

    async function check() {
      if (document.visibilityState === 'hidden') return
      try {
        const response = await fetch('/api/version', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json().catch(() => ({}))) as { buildId?: string }
        if (cancelled || !data.buildId || data.buildId === BUILD_ID) return

        const audio = document.querySelector('audio')
        const playing = Boolean(audio && !audio.paused && !audio.ended)
        const active = document.activeElement as HTMLElement | null
        const editing = Boolean(
          active &&
            (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable),
        )
        const dialog = Boolean(document.querySelector('[role="dialog"]'))

        if (playing || editing || dialog) {
          setPending(true)
          return
        }
        window.location.reload()
      } catch {
        /* network hiccup: try again on the next tick */
      }
    }

    const initial = setTimeout(() => void check(), 5000)
    const timer = setInterval(() => void check(), 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearTimeout(initial)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!pending) return null

  return (
    <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-300/30 bg-[#1b160d]/95 px-4 py-2 shadow-2xl backdrop-blur-md">
      <span className="whitespace-nowrap text-xs font-medium text-amber-100">
        Сайт обновился
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-black transition hover:bg-amber-300"
      >
        <RefreshCw size={11} />
        Обновить
      </button>
    </div>
  )
}
