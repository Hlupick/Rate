'use client'

import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { usePlayer, type PlayerTrack } from '@/components/player/PlayerProvider'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

export function RecentGrid({ tracks, label }: { tracks: Track[]; label?: string }) {
  const { play, toggle, current, isPlaying } = usePlayer()
  const queue: PlayerTrack[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    liked: t.liked,
  }))

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {tracks.map((track) => {
        const isCurrent = current?.id === track.id
        return (
          <div
            key={track.id}
            className="group relative flex items-center gap-3 overflow-hidden rounded-md bg-white/[0.07] pr-3 transition hover:bg-white/[0.12]"
          >
            <Avatar
              name={track.artist}
              shape="square"
              className="h-14 w-14 rounded-none sm:h-16 sm:w-16"
              textClassName="text-base"
            />
            <Link
              href={`/track/${track.id}`}
              className="min-w-0 flex-1 truncate text-[12.5px] font-semibold sm:text-[13.5px]"
            >
              {track.title}
            </Link>
            <button
              onClick={() => {
                if (isCurrent) toggle()
                else play(track, queue, label ?? 'Недавно слушали')
              }}
              aria-label={isCurrent && isPlaying ? 'Пауза' : 'Играть'}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-lg transition sm:h-10 sm:w-10',
                'opacity-0 group-hover:opacity-100',
                isCurrent && 'opacity-100',
              )}
            >
              {isCurrent && isPlaying ? (
                <Pause size={15} className="fill-current" />
              ) : (
                <Play size={15} className="translate-x-[1px] fill-current" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
