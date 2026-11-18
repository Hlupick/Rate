'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Menu({
  children,
  className,
  align = 'right',
}: {
  children: (close: () => void) => React.ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function toggle(event: React.MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 224
    const estimatedHeight = 240
    const top =
      rect.bottom + estimatedHeight > window.innerHeight
        ? Math.max(8, rect.top - estimatedHeight - 4)
        : rect.bottom + 4
    const left =
      align === 'right'
        ? Math.min(window.innerWidth - width - 8, rect.right - width)
        : Math.max(8, rect.left)
    setPos({ top, left })
    setOpen((value) => !value)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label="Дополнительно"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink',
          open && 'bg-white/10 text-ink',
          className,
        )}
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="animate-pop z-[80] w-56 overflow-hidden rounded-lg border border-line bg-[#1b1b1b] p-1 shadow-2xl"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  )
}

export function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition hover:bg-white/5',
        danger ? 'text-red-400 hover:text-red-300' : 'text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
