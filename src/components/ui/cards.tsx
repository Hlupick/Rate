import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { StatusPill } from '@/components/profile/StatusPill'
import { tracksWord } from '@/lib/format'
import type { Playlist, UserSearchResult } from '@/lib/types'

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

export function UserCard({ person }: { person: UserSearchResult }) {
  return (
    <Link
      href={`/profile/${person.username}`}
      className="flex items-center gap-3 rounded-lg bg-card p-3 transition-colors hover:bg-card-hover"
    >
      <Avatar
        name={person.displayName}
        src={person.avatar}
        frame={person.avatarFrame}
        className="h-12 w-12 shrink-0"
        textClassName="text-sm"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{person.displayName}</div>
        <div className="truncate text-[12px] text-muted">@{person.username}</div>
        {person.status && (
          <StatusPill
            text={person.status}
            color={person.statusColor}
            className="mt-1 py-0 text-[10px]"
          />
        )}
      </div>
    </Link>
  )
}
