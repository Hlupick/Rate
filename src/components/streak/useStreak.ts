'use client'

import { useEffect, useState } from 'react'
import { localDay } from '@/lib/streak'

export type StreakView = {
  current: number
  best: number
  goal: number
  todaySeconds: number | null
}

const cache = new Map<string, { view: StreakView; at: number }>()
const CACHE_TTL_MS = 60_000

function normalize(data: Record<string, unknown>): StreakView {
  return {
    current: Number(data.current ?? 0),
    best: Number(data.best ?? 0),
    goal: Number(data.goal ?? 60),
    todaySeconds: data.todaySeconds === null ? null : Number(data.todaySeconds ?? 0),
  }
}

/**
 * Loads the streak for `username` or for the signed-in listener when omitted.
 * The owner's badge also subscribes to player updates (`monah:streak`).
 */
export function useStreak(username?: string) {
  const [state, setState] = useState<StreakView | null>(null)

  useEffect(() => {
    const day = localDay()
    const key = `${username ?? 'me'}:${day}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setState(cached.view)
      return
    }

    const query = new URLSearchParams({ day })
    if (username) query.set('user', username)
    let cancelled = false

    fetch(`/api/streak?${query.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || cancelled) return
        const view = normalize(data)
        cache.set(key, { view, at: Date.now() })
        setState(view)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    if (username) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakView>).detail
      if (!detail) return
      setState(detail)
      cache.set(`me:${localDay()}`, { view: detail, at: Date.now() })
    }
    window.addEventListener('monah:streak', handler)
    return () => window.removeEventListener('monah:streak', handler)
  }, [username])

  return state
}
