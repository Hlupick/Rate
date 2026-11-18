'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type BarProps = {
  value: number
  onChange?: (value: number) => void
  className?: string
  trackClassName?: string
  fillClassName?: string
  disabled?: boolean
  ariaLabel?: string
}

export function Bar({
  value,
  onChange,
  className,
  trackClassName,
  fillClassName,
  disabled,
  ariaLabel,
}: BarProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)

  const ratioFromEvent = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !onChange) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    onChange(ratioFromEvent(event.clientX))
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled || !onChange) return
    onChange(ratioFromEvent(event.clientX))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  const pct = Math.max(0, Math.min(1, value)) * 100

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'group relative flex h-4 w-full items-center touch-none select-none',
        disabled && 'cursor-default',
        !disabled && 'cursor-pointer',
        className,
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-white/20 transition-all',
          hover || dragging ? 'h-1.5' : 'h-1',
          trackClassName,
        )}
      >
        <div
          className={cn('h-full rounded-full bg-white transition-colors', fillClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!disabled && (
        <div
          className={cn(
            'absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow transition-opacity',
            hover || dragging ? 'opacity-100' : 'opacity-0',
          )}
          style={{ left: `${pct}%` }}
        />
      )}
    </div>
  )
}
