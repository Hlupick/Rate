import { Disc3 } from 'lucide-react'
import { coverUrl, fallbackGradient } from '@/lib/format'
import { cn } from '@/lib/utils'

type CoverProps = {
  cover: string | null | undefined
  alt: string
  seed?: string
  className?: string
  iconSize?: number
}

export function Cover({ cover, alt, seed, className, iconSize = 24 }: CoverProps) {
  const url = coverUrl(cover)
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-md bg-card', className)}
      style={url ? undefined : { background: fallbackGradient(seed ?? alt) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
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
  const url = coverUrl(cover)
  return (
    <div
      className={cn('overflow-hidden bg-card', className)}
      style={url ? undefined : { background: fallbackGradient(seed ?? '') }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
    </div>
  )
}
