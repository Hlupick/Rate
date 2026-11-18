import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { TrackAvatar } from '@/components/track/TrackAvatar'
import { SectionHeader } from '@/components/ui/Section'
import { timeAgo } from '@/lib/format'
import type { FriendActivityItem } from '@/lib/friend-feed'

/** Recent approved uploads and public playlists from mutual friends. */
export function FriendFeed({ items }: { items: FriendActivityItem[] }) {
  if (items.length === 0) return null

  return (
    <>
      <SectionHeader title="У друзей" />
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const href =
            item.kind === 'track' ? `/track/${item.id}` : `/playlist/${item.id}`
          return (
            <Link
              key={`${item.kind}-${item.id}-${item.at}`}
              href={href}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-2.5 transition hover:border-white/15 hover:bg-white/[0.04]"
            >
              {item.kind === 'track' ? (
                <TrackAvatar title={item.title} className="h-11 w-11" />
              ) : (
                <Avatar
                  name={item.name}
                  src={item.avatar ?? item.cover}
                  shape="square"
                  className="h-11 w-11"
                  textClassName="text-[10px]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] text-muted">
                  <span className="font-medium text-ink/85">{item.user.displayName}</span>{' '}
                  {item.kind === 'track' ? 'загрузил трек' : 'создал плейлист'}
                </div>
                <div className="truncate text-sm font-medium text-ink">
                  {item.kind === 'track' ? item.title : item.name}
                </div>
                <div className="truncate text-[10px] text-dim">
                  {item.kind === 'track'
                    ? `${item.artist} · ${timeAgo(item.at)}`
                    : `Плейлист · ${timeAgo(item.at)}`}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
