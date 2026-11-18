import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Headphones, MessageCircle, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getOwnedFrames } from '@/lib/frames'
import { getUserPoints } from '@/lib/points'
import { getFollowRelation, getFollowStats } from '@/lib/social'
import { getPresence } from '@/lib/presence'
import { getPlaylistsByOwner, getListeningSeconds, getUserByUsername, listTracks } from '@/lib/queries'
import { CardGrid, SectionHeader } from '@/components/ui/Section'
import { PlaylistCard } from '@/components/ui/cards'
import { TrackList } from '@/components/track/TrackList'
import { Avatar } from '@/components/ui/Avatar'
import { CoverBanner } from '@/components/ui/Cover'
import { ProfileEditor } from '@/components/profile/ProfileEditor'
import { StreakChip } from '@/components/streak/StreakChip'
import { StreakReturnsChip } from '@/components/streak/StreakReturnsChip'
import { StatusPill } from '@/components/profile/StatusPill'
import { PointsHint } from '@/components/profile/PointsHint'
import { FollowButton } from '@/components/social/FollowButton'
import { ProfileConnections } from '@/components/social/ProfileConnections'
import { PresenceBadge } from '@/components/social/PresenceBadge'
import { formatCount, formatTotalDuration } from '@/lib/format'

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
  const listeningSeconds = getListeningSeconds(profile.id)
  const points = isSelf ? getUserPoints(profile.id) : 0
  const ownedFrames = isSelf ? getOwnedFrames(profile.id) : []
  const followStats = getFollowStats(profile.id)
  const relation = viewer ? getFollowRelation(viewer.id, profile.id) : 'none'
  const presence = getPresence(profile.id)

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <CoverBanner
            cover={profile.cover}
            seed={profile.username}
            className="h-full w-full"
          />
        </div>
        <div className="relative flex flex-col items-center gap-6 px-4 pb-6 pt-10 text-center md:flex-row md:items-end md:px-6 md:pt-14 md:text-left">
          <Avatar
            name={profile.displayName}
            src={profile.avatar}
            frame={profile.avatarFrame}
            frameScale="lg"
            animated
            className="h-36 w-36 md:h-44 md:w-44"
            textClassName="text-4xl"
          />
          <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md md:w-auto md:max-w-[760px] md:flex-1 md:px-5 md:py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Профиль
            </div>
            <h1 className="mt-2 flex flex-wrap items-center justify-center gap-2 break-words text-3xl font-extrabold tracking-tight md:justify-start md:text-4xl xl:text-5xl">
              <span>{profile.displayName}</span>
              <StreakChip username={profile.username} variant="glass" />
              {profile.status && <StatusPill text={profile.status} color={profile.statusColor} />}
            </h1>
            <p className="mt-2 text-sm text-muted">
              @{profile.username} · загрузок: {uploads.length} · прослушиваний:{' '}
              {formatCount(totalPlays)}
            </p>
            {(listeningSeconds > 0 || isSelf) && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                {listeningSeconds > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
                    <Headphones size={14} className="text-amber-300" aria-hidden />
                    <span className="text-sm font-bold tabular-nums text-amber-100">
                      {formatTotalDuration(listeningSeconds)}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-200/70">
                      в музыке
                    </span>
                  </span>
                )}
                {isSelf && (
                  <PointsHint>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
                      <Sparkles size={14} className="text-amber-300" aria-hidden />
                      <span className="text-sm font-bold tabular-nums text-amber-100">
                        {formatCount(points)}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-amber-200/70">
                        баллов
                      </span>
                    </span>
                  </PointsHint>
                )}
                {isSelf && <StreakReturnsChip />}
              </div>
            )}
            {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted">{profile.bio}</p>}
            <ProfileConnections username={profile.username} stats={followStats} />
            {!isSelf && (
              <div className="mt-1.5 flex justify-center md:justify-start">
                <PresenceBadge
                  username={profile.username}
                  initialLastSeenAt={presence.lastSeenAt}
                  initialOnline={presence.online}
                />
              </div>
            )}
            {!isSelf && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <FollowButton
                  username={profile.username}
                  initialRelation={relation}
                  isAuthenticated={Boolean(viewer)}
                />
                {relation === 'friends' && (
                  <Link
                    href={`/chats?with=${encodeURIComponent(profile.username)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-md transition hover:border-white/25 hover:bg-black/60 hover:text-ink"
                  >
                    <MessageCircle size={13} /> Написать
                  </Link>
                )}
              </div>
            )}
            {isSelf && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                <ProfileEditor
                  displayName={profile.displayName}
                  bio={profile.bio}
                  status={profile.status}
                  statusColor={profile.statusColor}
                  avatar={profile.avatar}
                  cover={profile.cover}
                  avatarFrame={profile.avatarFrame}
                  points={points}
                  ownedFrames={ownedFrames}
                  isAdmin={profile.isAdmin}
                  isModerator={profile.isModerator}
                  username={profile.username}
                />
                <Link
                  href="/upload"
                  className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-md transition hover:border-white/25 hover:bg-black/60 hover:text-ink"
                >
                  Загрузить трек
                </Link>
                <Link
                  href="/library"
                  className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-md transition hover:border-white/25 hover:bg-black/60 hover:text-ink"
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
