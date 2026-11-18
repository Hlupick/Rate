'use client'

import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { Cover } from '@/components/ui/Cover'
import { usePlayer, type PlayerTrack } from '@/components/player/PlayerProvider'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PlayButton({
  onClick,
  playing,
  size = 'md',
  className,
}: {
  onClick: (event: React.MouseEvent) => void
  playing?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  const icon = size === 'lg' ? 22 : size === 'sm' ? 13 : 17
  return (
    <button
      onClick={onClick}
      aria-label={playing ? 'Пауза' : 'Играть'}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 active:scale-95',
        dims,
        className,
      )}
    >
      {playing ? (
        <Pause size={icon} className="fill-current" />
      ) : (
        <Play size={icon} className="translate-x-[1px] fill-current" />
      )}
    </button>
  )
}

export function TrackCard({
  track,
  list,
  label,
  subtitle,
}: {
  track: Track
  list?: Track[]
  label?: string
  subtitle?: string
}) {
  const { play, current, isPlaying, toggle } = usePlayer()
  const isCurrent = current?.id === track.id
  const queue: PlayerTrack[] = (list ?? [track]).map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    cover: t.cover,
    liked: t.liked,
  }))

  return (
    <div className="group relative flex h-full flex-col rounded-lg bg-card p-3 transition-colors hover:bg-card-hover">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-md shadow-lg">
        <Cover cover={track.cover} alt={track.title} seed={track.artist} className="h-full w-full" iconSize={28} />
        <PlayButton
          playing={isCurrent && isPlaying}
          onClick={(event) => {
            event.preventDefault()
            if (isCurrent) toggle()
            else play(track, queue, label ?? track.artist)
          }}
          className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
        />
      </div>
      <Link href={`/track/${track.id}`} className="block truncate text-[14px] font-semibold hover:underline">
        {track.title}
      </Link>
      <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
        {subtitle ?? (
          <Link
            href={`/artist/${encodeURIComponent(track.artist)}`}
            className="hover:text-ink hover:underline"
          >
            {track.artist}
          </Link>
        )}
      </div>
    </div>
  )
}
