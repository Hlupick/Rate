import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getPlaylistsByOwner, getUserByUsername, listTracks } from '@/lib/queries'
import { CardGrid, SectionHeader } from '@/components/ui/Section'
import { PlaylistCard } from '@/components/ui/cards'
import { TrackList } from '@/components/track/TrackList'
import { Avatar } from '@/components/ui/Avatar'
import { formatCount } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = getUserByUsername(username)
  return { title: profile ? profile.displayName : 'Профиль' }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const viewer = await getCurrentUser()
  const profile = getUserByUsername(username)
  if (!profile) notFound()

  const uploads = listTracks({ uploaderId: profile.id, viewerId: viewer?.id, limit: 100 })
  const allPlaylists = getPlaylistsByOwner(profile.id)
  const playlists = viewer?.id === profile.id ? allPlaylists : allPlaylists.filter((p) => p.isPublic)
  const isSelf = viewer?.id === profile.id
  const totalPlays = uploads.reduce((acc, track) => acc + track.playCount, 0)

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent" />
        <div className="relative flex flex-col items-center gap-6 px-4 pb-6 pt-10 text-center md:flex-row md:items-end md:px-6 md:pt-14 md:text-left">
          <Avatar
            name={profile.displayName}
            className="h-36 w-36 md:h-44 md:w-44"
            textClassName="text-4xl"
          />
          <div className="w-full min-w-0 md:w-auto">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Профиль
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">
              {profile.displayName}
            </h1>
            <p className="mt-2 text-sm text-muted">
              @{profile.username} · загрузок: {uploads.length} · прослушиваний:{' '}
              {formatCount(totalPlays)}
            </p>
            {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted">{profile.bio}</p>}
            {isSelf && (
              <div className="mt-3 flex justify-center gap-2 md:justify-start">
                <Link
                  href="/upload"
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
                >
                  Загрузить трек
                </Link>
                <Link
                  href="/library"
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
                >
                  Моя медиатека
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6">
        {playlists.length > 0 && (
          <>
            <SectionHeader title={isSelf ? 'Ваши плейлисты' : 'Плейлисты'} />
            <CardGrid>
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </CardGrid>
          </>
        )}

        <SectionHeader title={isSelf ? 'Ваши загрузки' : 'Загруженные треки'} />
        {uploads.length === 0 ? (
          <p className="text-sm text-muted">
            {isSelf ? (
              <>
                Вы пока ничего не загрузили.{' '}
                <Link href="/upload" className="underline hover:text-ink">
                  Добавить трек
                </Link>
              </>
            ) : (
              'Этот слушатель пока ничего не загрузил.'
            )}
          </p>
        ) : (
          <TrackList tracks={uploads} viewerId={viewer?.id ?? null} label="Загрузки" showDate />
        )}
      </div>
    </div>
  )
}
