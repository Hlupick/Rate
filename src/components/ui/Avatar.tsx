'use client'

import { useEffect, useState } from 'react'
import { avatarFrameTheme } from '@/lib/avatar-frame'
import { coverUrl, fallbackGradient, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Avatar({
  name,
  src,
  shape = 'circle',
  frame = 'none',
  frameScale = 'sm',
  animated = false,
  className,
  textClassName,
}: {
  name: string
  src?: string | null
  shape?: 'circle' | 'square'
  frame?: string | null
  /** Larger ring for the big avatar on the profile page. */
  frameScale?: 'sm' | 'lg'
  /** Animate only where it is worth the battery: profile and editor previews. */
  animated?: boolean
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const url = coverUrl(src)
  const theme = avatarFrameTheme(frame)
  const hasFrame = theme.key !== 'none'

  useEffect(() => {
    setFailed(false)
  }, [url])

  const showImage = Boolean(url) && !failed

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center',
        shape === 'square' ? 'rounded-md' : 'rounded-full',
        hasFrame && 'avatar-frame',
        hasFrame && theme.className,
        hasFrame && frameScale === 'lg' && 'avatar-frame-lg',
        hasFrame && animated && 'avatar-frame-animated',
        className,
      )}
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] bg-gradient-to-br from-[#4a4a4a] via-[#2a2a2a] to-[#141414] shadow-2xl"
        style={showImage ? undefined : { background: fallbackGradient(name) }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url!}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <>
            {shape === 'circle' && (
              <>
                <span className="absolute h-[150%] w-[150%] rounded-full border border-white/[0.05]" />
                <span className="absolute h-[104%] w-[104%] rounded-full border border-white/[0.07]" />
                <span className="absolute h-[64%] w-[64%] rounded-full border border-white/[0.09]" />
              </>
            )}
            <span className={cn('relative font-black tracking-tight text-white/80', textClassName)}>
              {initials(name)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
