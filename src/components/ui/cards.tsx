import Link from 'next/link'
import { Cover } from '@/components/ui/Cover'
import { tracksWord } from '@/lib/format'
import type { Playlist } from '@/lib/types'

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group relative flex h-full flex-col rounded-lg bg-card p-3 transition-colors hover:bg-card-hover"
    >
      <Cover
        cover={playlist.cover}
        alt={playlist.name}
        seed={playlist.id}
        className="mb-3 aspect-square w-full rounded-md shadow-lg"
        iconSize={28}
      />
      <div className="truncate text-[14px] font-semibold">{playlist.name}</div>
      <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
        {playlist.description || `Плейлист · ${tracksWord(playlist.trackCount)}`}
      </div>
    </Link>
  )
}

export function ArtistCard({
  artist,
  trackCount,
}: {
  artist: string
  trackCount: number
  cover?: string | null
}) {
  return (
    <Link
      href={`/artist/${encodeURIComponent(artist)}`}
      className="group flex h-full flex-col rounded-lg bg-card p-3 transition-colors hover:bg-card-hover"
    >
      <div className="mb-3 aspect-square w-full overflow-hidden rounded-full bg-gradient-to-br from-[#3b3b3b] to-[#1b1b1b] shadow-lg">
        <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/70">
          {artist.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <div className="truncate text-[14px] font-semibold">{artist}</div>
      <div className="mt-0.5 text-[12.5px] text-muted">
        Исполнитель · {tracksWord(trackCount)}
      </div>
    </Link>
  )
}
