'use client'

import { useEffect, useState } from 'react'
import { Disc3 } from 'lucide-react'
import { coverUrl, fallbackGradient } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Loads a stored cover and falls back to the gradient when the file is gone. */
function useCover(cover: string | null | undefined) {
  const url = coverUrl(cover)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [url])

  return {
    url,
    show: Boolean(url) && !failed,
    onError: () => setFailed(true),
  }
}

type CoverProps = {
  cover: string | null | undefined
  alt: string
  seed?: string
  className?: string
  iconSize?: number
}

export function Cover({ cover, alt, seed, className, iconSize = 24 }: CoverProps) {
  const image = useCover(cover)
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-md bg-card', className)}
      style={image.show ? undefined : { background: fallbackGradient(seed ?? alt) }}
    >
      {image.show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url!}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={image.onError}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/35">
          <Disc3 size={iconSize} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}

/** Wide header image for playlists and profiles. Falls back to a gradient. */
export function CoverBanner({
  cover,
  seed,
  className,
}: {
  cover: string | null | undefined
  seed?: string
  className?: string
}) {
  const image = useCover(cover)
  return (
    <div
      className={cn('overflow-hidden bg-card', className)}
      style={{ background: fallbackGradient(seed ?? '') }}
    >
      {image.show && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={image.onError}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
    </div>
  )
}
