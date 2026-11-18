'use client'

import { Pause, Play } from 'lucide-react'
import { usePlayer, type PlayerTrack } from '@/components/player/PlayerProvider'
import { LikeButton } from '@/components/track/LikeButton'
import { TrackMenu } from '@/components/track/TrackMenu'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

function toQueue(tracks: Track[]): PlayerTrack[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    cover: t.cover,
    liked: t.liked,
  }))
}

export function PlayAllButton({
  tracks,
  label,
  size = 'lg',
}: {
  tracks: Track[]
  label: string
  size?: 'md' | 'lg'
}) {
  const { play, toggle, current, isPlaying } = usePlayer()
  if (tracks.length === 0) return null
  const active = Boolean(current && tracks.some((t) => t.id === current.id)) && isPlaying
  const dims = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12'

  return (
    <button
      onClick={() => {
        if (active) {
          toggle()
          return
        }
        const index = current ? tracks.findIndex((t) => t.id === current.id) : -1
        const start = index >= 0 ? tracks[index] : tracks[0]
        play(start, toQueue(tracks), label)
      }}
      aria-label={active ? 'Пауза' : 'Слушать'}
      className={cn(
        'flex items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 active:scale-95',
        dims,
      )}
    >
      {active ? (
        <Pause size={22} className="fill-current" />
      ) : (
        <Play size={22} className="translate-x-[1px] fill-current" />
      )}
    </button>
  )
}

export function TrackHeroActions({
  track,
  list,
  viewerId,
}: {
  track: Track
  list: Track[]
  viewerId: string | null
}) {
  const { play, toggle, current, isPlaying } = usePlayer()
  const active = current?.id === track.id && isPlaying

  return (
    <div className="flex items-center justify-center gap-3 md:justify-start">
      <button
        onClick={() => {
          if (active) toggle()
          else play(track, toQueue(list), 'Трек')
        }}
        aria-label={active ? 'Пауза' : 'Слушать'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 active:scale-95"
      >
        {active ? (
          <Pause size={22} className="fill-current" />
        ) : (
          <Play size={22} className="translate-x-[1px] fill-current" />
        )}
      </button>
      <LikeButton
        trackId={track.id}
        initialLiked={track.liked}
        size={28}
        className="rounded-full border border-white/10 p-2.5"
      />
      <TrackMenu
        track={track}
        canDelete={Boolean(viewerId && viewerId === track.uploaderId)}
        canReport={Boolean(viewerId)}
      />
    </div>
  )
}
