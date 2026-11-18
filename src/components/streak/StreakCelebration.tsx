'use client'

import { useEffect, useRef, useState } from 'react'
import { daysWord } from '@/lib/format'
import { StreakFlame } from './StreakFlame'

type StreakEvent = { milestone?: number | null }

/** Full-screen-ish toast when the streak hits 10, 30, 50, 100, 150… days. */
export function StreakCelebration() {
  const [milestone, setMilestone] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakEvent>).detail
      if (!detail?.milestone) return
      setMilestone(detail.milestone)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMilestone(null), 5000)
    }
    window.addEventListener('monah:streak', handler)
    return () => {
      window.removeEventListener('monah:streak', handler)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  if (!milestone) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-4">
      <div className="streak-burst relative flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-[#1a1204]/95 px-5 py-3.5 shadow-[0_0_45px_rgba(251,191,36,0.35)] backdrop-blur">
        <span className="streak-spark absolute left-[22%] top-1" />
        <span className="streak-spark absolute left-[30%] top-2" style={{ animationDelay: '0.5s' }} />
        <span className="streak-spark absolute right-[26%] top-1" style={{ animationDelay: '1s' }} />
        <StreakFlame days={milestone} size={36} />
        <div>
          <div className="text-sm font-bold text-amber-200">Серия {daysWord(milestone)}!</div>
          <div className="text-[11px] text-amber-100/70">
            Огонёк стал ярче — не теряйте ритм
          </div>
        </div>
      </div>
    </div>
  )
}
