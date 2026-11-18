import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Lock, Globe2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
  getPlaylist,
  getPlaylistTracks,
  getUserByUsername,
} from '@/lib/queries'
import { Avatar } from '@/components/ui/Avatar'
import { StreakChip } from '@/components/streak/StreakChip'
import { CoverBanner } from '@/components/ui/Cover'
import { PlayAllButton } from '@/components/track/Actions'
import { TrackList } from '@/components/track/TrackList'
import { PlaylistMenu } from '@/components/playlist/PlaylistMenu'
import { formatTotalDuration, timeAgo, tracksWord } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const playlist = getPlaylist(id)
  return { title: playlist ? playlist.name : 'Плейлист' }
}

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const playlist = getPlaylist(id)
  if (!playlist) notFound()

  const isOwner = user?.id === playlist.ownerId
  if (!playlist.isPublic && !isOwner) notFound()

  const tracks = getPlaylistTracks(playlist.id, user?.id)
  const owner = getUserByUsername(playlist.ownerUsername)
  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0)

  return (
    <div>
      <div className="relative overflow-hidden">
        <CoverBanner
          cover={playlist.cover}
          seed={playlist.id}
          className="absolute inset-0 h-full w-full"
        />
        <div className="relative flex flex-col items-center gap-6 px-4 pb-5 pt-8 text-center md:flex-row md:items-end md:px-6 md:pt-12 md:text-left">
          <Avatar
            name={playlist.name}
            src={playlist.avatar ?? playlist.cover}
            shape="square"
            className="h-44 w-44 rounded-lg shadow-2xl md:h-56 md:w-56"
            textClassName="text-5xl md:text-6xl"
          />
          <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md md:w-auto md:max-w-[820px] md:flex-1 md:px-5 md:py-4">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted md:justify-start">
              {playlist.isPublic ? <Globe2 size={13} /> : <Lock size={13} />} Плейлист
            </div>
            <h1 className="mt-2 break-words text-3xl font-extrabold leading-tight tracking-tight md:text-4xl xl:text-5xl">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted">{playlist.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted md:justify-start">
              {owner && (
                <>
                  <Link
                    href={`/profile/${owner.username}`}
                    className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
                  >
                    <Avatar
                      name={owner.displayName}
                      src={owner.avatar}
                      frame={owner.avatarFrame}
                      className="h-5 w-5"
                      textClassName="text-[8px]"
                    />
                    {owner.displayName}
                  </Link>
                  <StreakChip username={owner.username} />
                </>
              )}
              <span>· {tracksWord(tracks.length)}</span>
              {tracks.length > 0 && <span>· {formatTotalDuration(totalDuration)}</span>}
              <span>· создан {timeAgo(playlist.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6">
        <div className="flex items-center justify-center gap-3 py-2 md:justify-start">
          <PlayAllButton tracks={tracks} label={playlist.name} />
          {isOwner && (
            <PlaylistMenu
              playlistId={playlist.id}
              name={playlist.name}
              description={playlist.description}
              avatar={playlist.avatar}
              cover={playlist.cover}
            />
          )}
        </div>

        <div className="mt-5">
          {tracks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center">
              <p className="text-base font-semibold">В плейлисте пока нет треков</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Откройте любой трек, нажмите «…» и выберите «Добавить в плейлист».
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
              >
                Найти музыку
              </Link>
            </div>
          ) : (
            <>
              <TrackList
                tracks={tracks}
                viewerId={user?.id ?? null}
                label={playlist.name}
                playlistId={isOwner ? playlist.id : undefined}
                showAlbum
                reorderable={isOwner && tracks.length > 1}
              />
              {isOwner && tracks.length > 1 && (
                <p className="mt-3 hidden text-xs text-dim md:block">
                  Перетащите треки, чтобы изменить порядок в плейлисте.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
