import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getTrack, getUserById, listTracks } from '@/lib/queries'
import { Avatar } from '@/components/ui/Avatar'
import { TrackAvatar } from '@/components/track/TrackAvatar'
import { TrackHeroActions } from '@/components/track/Actions'
import { TrackList } from '@/components/track/TrackList'
import { StreakChip } from '@/components/streak/StreakChip'
import { formatCount, formatDuration, timeAgo, tracksWord } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const track = getTrack(id)
  return { title: track ? `${track.title} — ${track.artist}` : 'Трек' }
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const track = getTrack(id, user?.id)
  if (!track) notFound()

  const related = listTracks({
    artist: track.artist,
    viewerId: user?.id,
    sort: 'popular',
    limit: 8,
  }).filter((item) => item.id !== track.id)

  const uploader = getUserById(track.uploaderId)
  const artistList = [track, ...related]

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.09] via-white/[0.02] to-transparent" />
        <div className="relative flex flex-col items-center gap-6 px-4 pb-6 pt-8 text-center md:flex-row md:items-end md:px-6 md:pt-12 md:text-left">
          <TrackAvatar
            title={track.title}
            className="h-44 w-44 rounded-lg p-4 shadow-2xl md:h-56 md:w-56"
            textClassName="text-2xl md:text-3xl"
          />
          <div className="w-full min-w-0 md:flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Трек
            </div>
            <h1 className="mt-2 break-words text-3xl font-extrabold leading-tight tracking-tight md:text-4xl xl:text-5xl">
              {track.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted md:justify-start">
              <Link
                href={`/artist/${encodeURIComponent(track.artist)}`}
                className="font-medium text-ink hover:underline"
              >
                {track.artist}
              </Link>
              {track.album && <span>· {track.album}</span>}
              {track.genre && <span className="capitalize">· {track.genre}</span>}
              <span>
                · {formatDuration(track.duration)} · {formatCount(track.playCount)} прослушиваний
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6">
        <TrackHeroActions track={track} list={artistList} viewerId={user?.id ?? null} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-3 text-lg font-bold">Ещё от {track.artist}</h2>
            {related.length > 0 ? (
              <TrackList
                tracks={related}
                viewerId={user?.id ?? null}
                label={track.artist}
                showHeader={false}
                showAlbum
              />
            ) : (
              <p className="text-sm text-muted">
                Это единственный трек исполнителя в библиотеке.
              </p>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-lg bg-card p-4">
              <div className="text-sm font-semibold">Об исполнителе</div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={track.artist} className="h-12 w-12" textClassName="text-base" />
                <div className="w-full min-w-0 md:w-auto">
                  <Link
                    href={`/artist/${encodeURIComponent(track.artist)}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {track.artist}
                  </Link>
                  <div className="text-xs text-muted">{tracksWord(related.length + 1)} в библиотеке</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card p-4 text-xs text-muted">
              <div className="mb-2 text-sm font-semibold text-ink">О треке</div>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-4">
                  <dt>Загрузил</dt>
                  <dd className="flex min-w-0 items-center justify-end gap-1.5 text-ink">
                    {uploader ? (
                      <Link
                        href={`/profile/${uploader.username}`}
                        className="flex min-w-0 items-center gap-1.5 hover:underline"
                      >
                        <Avatar
                          name={uploader.displayName}
                          src={uploader.avatar}
                          frame={uploader.avatarFrame}
                          className="h-5 w-5"
                          textClassName="text-[8px]"
                        />
                        <span className="truncate">{uploader.displayName}</span>
                      </Link>
                    ) : (
                      '—'
                    )}
                    {uploader && <StreakChip username={uploader.username} />}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Добавлен</dt>
                  <dd className="text-ink">{timeAgo(track.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Длительность</dt>
                  <dd className="text-ink">{formatDuration(track.duration)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Прослушиваний</dt>
                  <dd className="text-ink">{formatCount(track.playCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Формат</dt>
                  <dd className="uppercase text-ink">
                    {track.mimeType.split('/').pop()?.replace('mpeg', 'mp3')}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
