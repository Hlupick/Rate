'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

type LikeButtonProps = {
  trackId: string
  initialLiked: boolean
  size?: number
  className?: string
}

export function LikeButton({ trackId, initialLiked, size = 16, className }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function toggle(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const nextValue = !liked
    setLiked(nextValue)
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      })
      if (!response.ok) throw new Error('failed')
      const data = (await response.json()) as { liked: boolean }
      setLiked(data.liked)
      startTransition(() => router.refresh())
    } catch {
      setLiked(!nextValue)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={liked ? 'Убрать из любимых' : 'Добавить в любимые'}
      className={cn(
        'rounded-full p-1.5 transition',
        liked ? 'text-accent' : 'text-muted hover:text-ink',
        pending && 'opacity-70',
        className,
      )}
    >
      <Heart size={size} className={liked ? 'fill-current' : undefined} strokeWidth={liked ? 0 : 1.8} />
    </button>
  )
}
