'use client'

import { useEffect, useState } from 'react'
import { STREAK_GOAL_SECONDS, localDay } from '@/lib/streak'

export type StreakView = {
  current: number
  best: number
  goal: number
  todaySeconds: number | null
  returnsLeft: number
  returnsLimit: number
  canReturn: boolean
  atRisk: number
}

const cache = new Map<string, { view: StreakView; at: number }>()
const CACHE_TTL_MS = 60_000

function normalize(data: Record<string, unknown>): StreakView {
  return {
    current: Number(data.current ?? 0),
    best: Number(data.best ?? 0),
    goal: Number(data.goal ?? STREAK_GOAL_SECONDS),
    todaySeconds: data.todaySeconds === null ? null : Number(data.todaySeconds ?? 0),
    returnsLeft: Number(data.returnsLeft ?? 0),
    returnsLimit: Number(data.returnsLimit ?? 5),
    canReturn: Boolean(data.canReturn),
    atRisk: Number(data.atRisk ?? 0),
  }
}

/**
 * Loads the streak for `username` or for the signed-in listener when omitted.
 * The owner's badge also subscribes to player updates (`monah:streak`) and to
 * returns (`monah:streak-changed`).
 */
export function useStreak(username?: string) {
  const [state, setState] = useState<StreakView | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion((value) => value + 1)
    window.addEventListener('monah:streak-changed', handler)
    return () => window.removeEventListener('monah:streak-changed', handler)
  }, [])

  useEffect(() => {
    const day = localDay()
    const key = `${username ?? 'me'}:${day}`
    const cached = version === 0 ? cache.get(key) : undefined
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
  }, [username, version])

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

/** Spends one monthly return on yesterday and refreshes every streak view. */
export async function requestStreakReturn(day = localDay()): Promise<StreakView> {
  const response = await fetch('/api/streak/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day }),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: string
  }
  if (!response.ok) throw new Error(data.error ?? 'Не удалось вернуть серию')

  const view = normalize(data)
  cache.set(`me:${day}`, { view, at: Date.now() })
  window.dispatchEvent(new Event('monah:streak-changed'))
  return view
}
