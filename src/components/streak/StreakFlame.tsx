'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Visual tiers for the listening streak:
 * 0 — no streak, 1–9 gentle ember, 10+ bright, 30+ breathing, 50+ sparks,
 * 100+ golden halo. Every extra 50 days just stays at the top tier.
 */
export function streakTier(days: number): number {
  if (days >= 100) return 5
  if (days >= 50) return 4
  if (days >= 30) return 3
  if (days >= 10) return 2
  if (days >= 1) return 1
  return 0
}

export function streakTextClass(days: number): string {
  const tier = streakTier(days)
  if (tier >= 5) return 'text-amber-200'
  if (tier >= 2) return 'text-amber-300'
  if (tier >= 1) return 'text-ink'
  return 'text-dim'
}

const FLAME_PATH =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'

const GLOW = [
  '',
  'drop-shadow-[0_0_3px_rgba(251,146,60,0.35)]',
  'drop-shadow-[0_0_5px_rgba(251,146,60,0.6)]',
  'drop-shadow-[0_0_7px_rgba(251,191,36,0.65)]',
  'drop-shadow-[0_0_9px_rgba(251,191,36,0.8)]',
  'drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]',
]

export function StreakFlame({
  days,
  size = 20,
  className,
}: {
  days: number
  size?: number
  className?: string
}) {
  const gradientId = useId().replace(/:/g, '')
  const tier = streakTier(days)
  const cold = tier === 0

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      aria-hidden="true"
    >
      {tier >= 5 && <span className="streak-halo absolute -inset-1.5 rounded-full" />}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={cn(
          'relative',
          GLOW[tier],
          tier >= 4 && 'streak-flicker',
          tier === 3 && 'streak-breathe',
        )}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0.35" y2="0">
            <stop offset="0%" stopColor={cold ? '#3f3f3f' : tier >= 5 ? '#f59e0b' : '#ea580c'} />
            <stop offset="55%" stopColor={cold ? '#525252' : tier >= 2 ? '#fbbf24' : '#f59e0b'} />
            <stop offset="100%" stopColor={cold ? '#6b6b6b' : tier >= 5 ? '#fef3c7' : '#fde68a'} />
          </linearGradient>
        </defs>
        <path d={FLAME_PATH} fill={`url(#${gradientId})`} />
      </svg>
      {tier >= 4 && (
        <>
          <span className="streak-spark absolute left-[38%] top-0" />
          <span className="streak-spark absolute left-[52%] top-[8%]" style={{ animationDelay: '0.6s' }} />
          <span className="streak-spark absolute left-[63%] top-[2%]" style={{ animationDelay: '1.2s' }} />
        </>
      )}
    </span>
  )
}
