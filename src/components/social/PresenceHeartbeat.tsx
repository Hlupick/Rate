'use client'

import { useEffect } from 'react'

/** Keeps the current listener marked as online while the site is open. */
export function PresenceHeartbeat() {
  useEffect(() => {
    let active = true

    async function ping() {
      if (!active || document.visibilityState === 'hidden') return
      try {
        await fetch('/api/presence', { method: 'POST' })
      } catch {
        /* offline */
      }
    }

    void ping()
    const timer = setInterval(() => void ping(), 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return null
}
