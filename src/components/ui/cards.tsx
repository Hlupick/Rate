import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { tracksWord } from '@/lib/format'
import type { Playlist } from '@/lib/types'

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group relative flex h-full flex-col rounded-lg bg-card p-3 transition-colors hover:bg-card-hover"
    >
      <Avatar
        name={playlist.name}
        src={playlist.avatar ?? playlist.cover}
        shape="square"
        className="mb-3 aspect-square w-full rounded-md shadow-lg"
        textClassName="text-3xl"
      />
      <div className="truncate text-[14px] font-semibold">{playlist.name}</div>
      <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
        {playlist.description ||
          `Плейлист · ${tracksWord(playlist.trackCount)}${
            playlist.missingCount > 0 ? ` · ${playlist.missingCount} не загружено` : ''
          }`}
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
}) {
  return (
    <Link
      href={`/artist/${encodeURIComponent(artist)}`}
      className="group flex h-full flex-col rounded-lg bg-card p-3 transition-colors hover:bg-card-hover"
    >
      <Avatar
        name={artist}
        className="mb-3 aspect-square w-full"
        textClassName="text-3xl"
      />
      <div className="truncate text-[14px] font-semibold">{artist}</div>
      <div className="mt-0.5 text-[12.5px] text-muted">
        Исполнитель · {tracksWord(trackCount)}
      </div>
    </Link>
  )
}
