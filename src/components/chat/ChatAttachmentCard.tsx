'use client'

import Link from 'next/link'
import { ChevronRight, Music2, Play } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TrackAvatar } from '@/components/track/TrackAvatar'
import { usePlayer } from '@/components/player/PlayerProvider'
import { formatDuration, tracksWord } from '@/lib/format'
import type { ChatAttachment } from '@/lib/chat'

/** Track or playlist card inside a chat bubble. */
export function ChatAttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  const { play } = usePlayer()

  if (attachment.type === 'track') {
    const track = attachment.track
    if (!track) return <Unavailable>Трек больше недоступен</Unavailable>
    return (
      <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/35 p-2 text-ink">
        <TrackAvatar title={track.title} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/track/${track.id}`}
            className="block truncate text-[13px] font-semibold hover:underline"
          >
            {track.title}
          </Link>
          <div className="truncate text-[11px] text-muted">{track.artist}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-dim">
            <Music2 size={10} /> {formatDuration(track.duration)}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            play({
              id: track.id,
              title: track.title,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
            })
          }
          aria-label={`Играть ${track.title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-black transition hover:bg-white"
        >
          <Play size={15} fill="currentColor" />
        </button>
      </div>
    )
  }

  const playlist = attachment.playlist
  if (!playlist) return <Unavailable>Плейлист больше недоступен</Unavailable>

  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/35 p-2 text-ink transition hover:bg-black/50"
    >
      <Avatar
        name={playlist.name}
        src={playlist.avatar ?? playlist.cover}
        shape="square"
        className="h-11 w-11"
        textClassName="text-[10px]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{playlist.name}</div>
        <div className="truncate text-[11px] text-muted">{playlist.ownerName}</div>
        <div className="mt-0.5 text-[10px] text-dim">
          Плейлист · {tracksWord(playlist.trackCount)}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-dim" />
    </Link>
  )
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 rounded-xl border border-dashed border-white/15 bg-black/25 px-3 py-2.5 text-[11px] text-muted">
      {children}
    </div>
  )
}
