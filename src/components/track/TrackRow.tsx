'use client'

import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { LikeButton } from '@/components/track/LikeButton'
import { TrackMenu } from '@/components/track/TrackMenu'
import { usePlayer, type PlayerTrack } from '@/components/player/PlayerProvider'
import { formatDuration, timeAgo } from '@/lib/format'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

type TrackRowProps = {
  track: Track
  index: number
  list: Track[]
  label?: string
  viewerId?: string | null
  showAlbum?: boolean
  showDate?: boolean
  playlistId?: string
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function TrackRow({
  track,
  index,
  list,
  label,
  viewerId,
  showAlbum = true,
  showDate = false,
  playlistId,
  onMoveUp,
  onMoveDown,
}: TrackRowProps) {
  const { play, toggle, current, isPlaying } = usePlayer()
  const isCurrent = current?.id === track.id
  const isPlayingThis = isCurrent && isPlaying
  const queue: PlayerTrack[] = list.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    liked: t.liked,
  }))

  function playThis() {
    if (isCurrent) toggle()
    else play(track, queue, label ?? 'Сейчас играет')
  }

  return (
    <div
      onDoubleClick={playThis}
      className={cn(
        'group flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-white/5 md:px-3',
        isCurrent && 'bg-white/[0.04]',
      )}
    >
      <div className="flex w-5 shrink-0 items-center justify-end">
        {isPlayingThis ? (
          <span className="flex h-4 items-end gap-[2px] group-hover:hidden">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="eq-bar h-3.5 w-[2px] rounded-full bg-accent"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          <span
            className={cn(
              'text-[13px] tabular-nums text-muted group-hover:hidden',
              isCurrent && 'text-accent',
            )}
          >
            {index + 1}
          </span>
        )}
        <button
          onClick={playThis}
          aria-label={isPlayingThis ? 'Пауза' : 'Играть'}
          className="hidden text-ink group-hover:block"
        >
          {isPlayingThis ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <Play size={14} className="fill-current" />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar
          name={track.artist}
          shape="square"
          className="h-10 w-10"
          textClassName="text-xs"
        />
        <div className="min-w-0">
          <Link
            href={`/track/${track.id}`}
            className={cn(
              'block truncate text-[14px] font-medium hover:underline',
              isCurrent ? 'text-accent' : 'text-ink',
            )}
          >
            {track.title}
          </Link>
          <Link
            href={`/artist/${encodeURIComponent(track.artist)}`}
            className="block truncate text-[12px] text-muted hover:text-ink hover:underline"
          >
            {track.artist}
          </Link>
        </div>
      </div>

      {showAlbum && (
        <Link
          href={`/track/${track.id}`}
          className="hidden w-[24%] truncate text-[12.5px] text-muted hover:text-ink hover:underline lg:block"
        >
          {track.album ?? '—'}
        </Link>
      )}

      {showDate && (
        <span className="hidden w-[12%] text-[12px] text-muted xl:block">
          {timeAgo(track.createdAt)}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <LikeButton
          trackId={track.id}
          initialLiked={track.liked}
          className={cn('opacity-100 md:opacity-0 md:group-hover:opacity-100', track.liked && 'md:opacity-100')}
        />
        <span className="hidden w-9 text-right text-[12px] tabular-nums text-muted sm:block">
          {formatDuration(track.duration)}
        </span>
        <TrackMenu
          track={track}
          canDelete={Boolean(viewerId && track.uploaderId === viewerId)}
          canReport={Boolean(viewerId)}
          playlistId={playlistId}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </div>
    </div>
  )
}
