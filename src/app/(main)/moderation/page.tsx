import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  AlertTriangle,
  Check,
  Disc3,
  ListMusic,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
  countOpenReports,
  countPendingTracks,
  countUsers,
  getTrack,
  getUserById,
  listAdminUsers,
  listAllPlaylists,
  listReports,
  listTracks,
} from '@/lib/queries'
import { formatCount, timeAgo } from '@/lib/format'
import {
  moderationBanAction,
  moderationReportAction,
  reviewTrackAction,
} from './actions'

export const metadata: Metadata = {
  title: 'Модерация',
  robots: { index: false, follow: false },
}

type Tab = 'people' | 'tracks' | 'playlists' | 'reports'

const TABS: { key: Tab; label: string }[] = [
  { key: 'people', label: 'Люди' },
  { key: 'tracks', label: 'Треки' },
  { key: 'playlists', label: 'Плейлисты' },
  { key: 'reports', label: 'Жалобы' },
]

const SMALL_BUTTON =
  'rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40'

const ROLE_LABEL: Record<string, string> = {
  user: 'пользователь',
  moderator: 'модератор',
  admin: 'администратор',
}

function statusBadge(status: 'pending' | 'approved' | 'rejected') {
  if (status === 'approved') {
    return 'bg-emerald-500/15 text-emerald-200'
  }
  if (status === 'rejected') {
    return 'bg-red-500/15 text-red-300'
  }
  return 'bg-amber-500/15 text-amber-200'
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.isModerator) notFound()

  const params = await searchParams
  const tab: Tab = TABS.some((item) => item.key === params.tab)
    ? (params.tab as Tab)
    : 'people'
  const q = (params.q ?? '').trim()
  const status =
    params.status === 'approved' || params.status === 'rejected' || params.status === 'all'
      ? params.status
      : 'pending'

  const people = listAdminUsers().reverse()
  const filteredPeople = q
    ? people.filter((row) =>
        `${row.username} ${row.displayName} ${row.email}`.toLowerCase().includes(q.toLowerCase()),
      )
    : people
  const tracks = listTracks({
    reviewStatus: status === 'all' ? 'all' : status,
    viewerId: user.id,
    limit: 200,
    sort: 'new',
  })
  const playlists = listAllPlaylists()
  const filteredPlaylists = q
    ? playlists.filter((playlist) =>
        `${playlist.name} ${playlist.ownerName} ${playlist.ownerUsername}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : playlists
  const reports = listReports()

  const pendingTracks = countPendingTracks()
  const openReports = countOpenReports()
  const usersCount = countUsers()

  return (
    <div className="px-4 pb-12 md:px-6">
      <div className="pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Управление
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Модерация</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Новые треки, люди, плейлисты и жалобы. Доступно модераторам и администраторам.
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <Disc3 size={14} /> На проверке
          </div>
          <div className="mt-2 text-2xl font-bold">{pendingTracks}</div>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <Users size={14} /> Пользователей
          </div>
          <div className="mt-2 text-2xl font-bold">{usersCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <AlertTriangle size={14} /> Открытых жалоб
          </div>
          <div className="mt-2 text-2xl font-bold">{openReports}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1 rounded-full bg-black/40 p-1">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/moderation?tab=${item.key}`}
            className={
              tab === item.key
                ? 'rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-ink'
                : 'rounded-full px-4 py-1.5 text-xs font-medium text-muted transition hover:text-ink'
            }
          >
            {item.label}
            {item.key === 'tracks' && pendingTracks > 0 && (
              <span className="ml-1 text-[10px] text-amber-200">{pendingTracks}</span>
            )}
            {item.key === 'reports' && openReports > 0 && (
              <span className="ml-1 text-[10px] text-amber-200">{openReports}</span>
            )}
          </Link>
        ))}
      </div>

      {(tab === 'people' || tab === 'playlists') && (
        <form method="get" className="mt-3 flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени, нику или e-mail"
            className="input max-w-sm"
          />
          <button type="submit" className={SMALL_BUTTON}>
            Найти
          </button>
          {q && (
            <Link href={`/moderation?tab=${tab}`} className={SMALL_BUTTON}>
              Сбросить
            </Link>
          )}
        </form>
      )}

      <div className="mt-4">
        {tab === 'people' && (
          <div className="space-y-2">
            {filteredPeople.map((row) => {
              const protectedUser = row.role !== 'user' || row.id === user.id
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${row.username}`}
                        className="truncate text-sm font-medium text-ink hover:underline"
                      >
                        {row.displayName}
                      </Link>
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                        {ROLE_LABEL[row.role]}
                      </span>
                      {row.isBanned && (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                          бан
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      @{row.username} · {row.email} · {timeAgo(row.createdAt)}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted">
                    {row.uploads} трек. · {row.playlists} плейл.
                  </div>
                  {!protectedUser && (
                    <form action={moderationBanAction}>
                      <input type="hidden" name="userId" value={row.id} />
                      <input type="hidden" name="banned" value={row.isBanned ? '0' : '1'} />
                      <button type="submit" className={SMALL_BUTTON}>
                        {row.isBanned ? 'Разбанить' : 'Забанить'}
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
            {filteredPeople.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">Никого не нашли.</p>
            )}
          </div>
        )}

        {tab === 'tracks' && (
          <div>
            <div className="mb-3 flex flex-wrap gap-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
                <Link
                  key={value}
                  href={`/moderation?tab=tracks&status=${value}`}
                  className={
                    status === value
                      ? 'rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-ink'
                      : 'rounded-full px-3 py-1 text-[11px] font-medium text-muted transition hover:text-ink'
                  }
                >
                  {value === 'pending'
                    ? 'На проверке'
                    : value === 'approved'
                      ? 'Одобренные'
                      : value === 'rejected'
                        ? 'Отклонённые'
                        : 'Все'}
                </Link>
              ))}
            </div>
            <div className="space-y-2">
              {tracks.map((track) => {
                const uploader = getUserById(track.uploaderId)
                return (
                  <div
                    key={track.id}
                    className="rounded-lg border border-line bg-card px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/track/${track.id}`}
                            className="truncate text-sm font-medium text-ink hover:underline"
                          >
                            {track.title}
                          </Link>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${statusBadge(
                              track.reviewStatus,
                            )}`}
                          >
                            {track.reviewStatus === 'approved'
                              ? 'одобрен'
                              : track.reviewStatus === 'rejected'
                                ? 'отклонён'
                                : 'на проверке'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {track.artist} · {uploader ? `@${uploader.username}` : 'автор удалён'} ·{' '}
                          {timeAgo(track.createdAt)} · {formatCount(track.playCount)} прослушиваний
                        </div>
                        {track.reviewNote && (
                          <div className="mt-1 text-[11px] text-red-300">
                            Причина: {track.reviewNote}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/track/${track.id}`} className={SMALL_BUTTON}>
                          Послушать
                        </Link>
                        <form action={reviewTrackAction}>
                          <input type="hidden" name="trackId" value={track.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                          >
                            <Check size={12} /> Одобрить
                          </button>
                        </form>
                        <form action={reviewTrackAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="trackId" value={track.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <input
                            name="note"
                            placeholder="Причина"
                            maxLength={200}
                            className="w-32 rounded-md border border-line bg-panel px-2 py-1 text-[11px] placeholder:text-dim focus:border-white/30"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition hover:bg-red-500/20"
                          >
                            <X size={12} /> Отклонить
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              })}
              {tracks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">Треков в этом списке нет.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'playlists' && (
          <div className="space-y-2">
            {filteredPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-3 py-3"
              >
                <ListMusic size={16} className="shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/playlist/${playlist.id}`}
                    className="truncate text-sm font-medium text-ink hover:underline"
                  >
                    {playlist.name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-muted">
                    @{playlist.ownerUsername} · {playlist.trackCount} трек. ·{' '}
                    {playlist.isPublic ? 'публичный' : 'приватный'}
                  </div>
                </div>
                <Link href={`/playlist/${playlist.id}`} className={SMALL_BUTTON}>
                  Открыть
                </Link>
              </div>
            ))}
            {filteredPlaylists.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">Плейлистов не нашли.</p>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.map((report) => {
              const track = getTrack(report.trackId)
              return (
                <div
                  key={report.id}
                  className="rounded-lg border border-line bg-card px-3 py-3"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/track/${report.trackId}`}
                          className="truncate text-sm font-medium text-ink hover:underline"
                        >
                          {track ? `${track.title} — ${track.artist}` : 'Трек удалён'}
                        </Link>
                        <span
                          className={
                            report.status === 'open'
                              ? 'rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200'
                              : 'rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200'
                          }
                        >
                          {report.status === 'open' ? 'открыта' : 'решена'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        {report.reason}
                        {report.comment ? ` · ${report.comment}` : ''} ·{' '}
                        {report.reporterName ?? 'гость'} · {timeAgo(report.createdAt)}
                      </div>
                    </div>
                    <form action={moderationReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={report.status === 'open' ? 'resolved' : 'open'}
                      />
                      <button type="submit" className={SMALL_BUTTON}>
                        {report.status === 'open' ? 'Решено' : 'Вернуть в работу'}
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
            {reports.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">Жалоб нет.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-dim">
        <ShieldCheck size={13} /> Вы видите скрытые треки и приватные плейлисты, но не можете
        редактировать чужие плейлисты.
      </div>
    </div>
  )
}
