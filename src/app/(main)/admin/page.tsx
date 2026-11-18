import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  AlertTriangle,
  HardDrive,
  KeyRound,
  Music4,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
  countOpenReports,
  countUsers,
  libraryStats,
  listAdminUsers,
  listInvites,
  listReports,
  listTracks,
} from '@/lib/queries'
import { QUOTAS, diskFreeBytes, formatBytes, storageUsageBytes } from '@/lib/storage'
import { formatCount, timeAgo } from '@/lib/format'
import { CopyButton } from '@/components/ui/CopyButton'
import {
  createInviteAction,
  deleteInviteAction,
  deleteTrackAction,
  setReportStatusAction,
  setUserFlagAction,
  setUserRoleAction,
} from './actions'

export const metadata: Metadata = {
  title: 'Админка',
  robots: { index: false, follow: false },
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-dim">{hint}</div>}
    </div>
  )
}

const SMALL_BUTTON =
  'rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.isAdmin) notFound()

  const { invite: createdCode } = await searchParams
  const users = listAdminUsers()
  const invites = listInvites()
  const reports = listReports('open')
  const recent = listTracks({ limit: 12, viewerId: user.id, sort: 'new' })
  const usage = await storageUsageBytes()
  const storageUsed = usage.tracks + usage.covers
  const free = await diskFreeBytes()
  const openReports = countOpenReports()
  const stats = libraryStats(user.id)

  return (
    <div className="px-4 pb-12 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Управление
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Админка</h1>
          <p className="mt-2 text-sm text-muted">
            Инвайты, права, жалобы и состояние диска. Доступно только администраторам.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Music4 size={14} />}
          label="Треки"
          value={formatCount(stats.tracks)}
          hint={`${formatCount(users.reduce((acc, u) => acc + u.uploads, 0))} загрузок · ${formatCount(stats.artists)} исполнителей`}
        />
        <Stat icon={<Users size={14} />} label="Пользователи" value={formatCount(countUsers())} />
        <Stat
          icon={<HardDrive size={14} />}
          label="Занято"
          value={formatBytes(storageUsed)}
          hint={`аудио ${formatBytes(usage.tracks)} · обложки ${formatBytes(usage.covers)} · свободно ${formatBytes(free)}`}
        />
        <Stat
          icon={<AlertTriangle size={14} />}
          label="Жалобы"
          value={formatCount(openReports)}
          hint="открытых"
        />
      </div>

      {createdCode && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3">
          <KeyRound size={16} />
          <span className="text-sm">Новый инвайт-код:</span>
          <code className="rounded bg-black/40 px-2 py-1 font-mono text-[16px] text-ink tracking-[0.18em]">
            {createdCode}
          </code>
          <CopyButton value={createdCode} />
          <span className="text-xs text-muted">
            Передайте его тому, кому хотите разрешить загрузку. Код появится в списке ниже.
          </span>
        </div>
      )}

      {/* Invites */}
      <section id="invites" className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <KeyRound size={16} /> Инвайты
        </h2>

        <form
          action={createInviteAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-4"
        >
          <label className="text-xs text-muted">
            <span className="mb-1 block uppercase tracking-wider">Сколько человек</span>
            <input
              type="number"
              name="maxUses"
              defaultValue={1}
              min={1}
              max={50}
              className="w-24 rounded-md border border-line bg-panel-2 px-2.5 py-1.5 text-sm text-ink focus:border-white/40"
            />
          </label>
          <label className="text-xs text-muted">
            <span className="mb-1 block uppercase tracking-wider">Срок, дней (0 — бессрочно)</span>
            <input
              type="number"
              name="days"
              defaultValue={0}
              min={0}
              max={365}
              className="w-28 rounded-md border border-line bg-panel-2 px-2.5 py-1.5 text-sm text-ink focus:border-white/40"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
          >
            Создать код
          </button>
        </form>

        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Код</th>
                <th className="px-3 py-2 font-medium">Использован</th>
                <th className="px-3 py-2 font-medium">Кем</th>
                <th className="px-3 py-2 font-medium">Срок</th>
                <th className="px-3 py-2 font-medium">Создал</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    Инвайтов пока нет
                  </td>
                </tr>
              )}
              {invites.map((invite) => {
                const expired = invite.expiresAt !== null && invite.expiresAt < Date.now()
                const exhausted = invite.uses >= invite.maxUses
                const state = expired ? 'истёк' : exhausted ? 'использован' : 'активен'
                return (
                  <tr key={invite.id} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <code className="font-mono tracking-[0.14em]">{invite.code}</code>
                        <CopyButton value={invite.code} />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {invite.uses} / {invite.maxUses}
                    </td>
                    <td className="px-3 py-2 text-muted">{invite.usedByName ?? '—'}</td>
                    <td className="px-3 py-2 text-muted">
                      {invite.expiresAt
                        ? new Date(invite.expiresAt).toLocaleDateString('ru-RU')
                        : 'бессрочно'}
                    </td>
                    <td className="px-3 py-2 text-muted">{invite.creatorName}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={
                            state === 'активен' ? 'text-xs text-accent' : 'text-xs text-dim'
                          }
                        >
                          {state}
                        </span>
                        <form action={deleteInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <button type="submit" className={SMALL_BUTTON} title="Удалить код">
                            <Trash2 size={13} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reports */}
      <section id="reports" className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <AlertTriangle size={16} /> Жалобы
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">
            Открытых жалоб нет.
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-line bg-card p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link href={`/track/${report.trackId}`} className="font-semibold hover:underline">
                    {report.trackTitle}
                  </Link>
                  <span className="text-muted">{report.trackArtist}</span>
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300">
                    {report.reason}
                  </span>
                  <span className="text-xs text-dim">
                    {report.reporterName ?? 'гость'} · {timeAgo(report.createdAt)}
                  </span>
                </div>
                {report.comment && <p className="mt-2 text-sm text-muted">{report.comment}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={deleteTrackAction}>
                    <input type="hidden" name="trackId" value={report.trackId} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-500/30 px-3 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                    >
                      Удалить трек
                    </button>
                  </form>
                  <form action={setReportStatusAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="status" value="resolved" />
                    <button type="submit" className={SMALL_BUTTON}>
                      Отметить решённой
                    </button>
                  </form>
                  <Link
                    href={`/track/${report.trackId}`}
                    className="rounded-md border border-line px-3 py-1 text-xs text-muted transition hover:text-ink"
                  >
                    Открыть трек
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users */}
      <section id="users" className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Users size={16} /> Пользователи
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Пользователь</th>
                <th className="px-3 py-2 font-medium">Загрузки</th>
                <th className="px-3 py-2 font-medium">Права</th>
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">
                      {row.displayName}
                      {row.isBanned && (
                        <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                          бан
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      @{row.username} · {row.email}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {row.uploads} шт · {formatBytes(row.uploadBytes)}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={
                          row.canUpload
                            ? 'rounded bg-white/10 px-1.5 py-0.5 text-ink'
                            : 'rounded bg-white/5 px-1.5 py-0.5 text-dim'
                        }
                      >
                        загрузка
                      </span>
                      {row.isAdmin && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-ink">админ</span>
                      )}
                      {row.role === 'moderator' && (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-200">
                          модератор
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <form action={setUserFlagAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="field" value="canUpload" />
                        <input type="hidden" name="value" value={row.canUpload ? '0' : '1'} />
                        <button type="submit" className={SMALL_BUTTON}>
                          {row.canUpload ? 'Забрать загрузку' : 'Выдать загрузку'}
                        </button>
                      </form>
                      <form action={setUserFlagAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="field" value="isAdmin" />
                        <input type="hidden" name="value" value={row.isAdmin ? '0' : '1'} />
                        <button type="submit" className={SMALL_BUTTON}>
                          {row.isAdmin ? 'Снять админа' : 'Сделать админом'}
                        </button>
                      </form>
                      <form action={setUserRoleAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={row.role === 'moderator' ? 'user' : 'moderator'}
                        />
                        <button type="submit" className={SMALL_BUTTON}>
                          {row.role === 'moderator' ? 'Снять модератора' : 'Сделать модератором'}
                        </button>
                      </form>
                      <form action={setUserFlagAction}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="field" value="isBanned" />
                        <input type="hidden" name="value" value={row.isBanned ? '0' : '1'} />
                        <button type="submit" className={SMALL_BUTTON}>
                          {row.isBanned ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent tracks */}
      <section id="tracks" className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={16} /> Последние треки
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Трек</th>
                <th className="px-3 py-2 font-medium">Добавлен</th>
                <th className="px-3 py-2 font-medium">Размер</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {recent.map((track) => (
                <tr key={track.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <Link href={`/track/${track.id}`} className="font-medium hover:underline">
                      {track.title}
                    </Link>
                    <div className="text-xs text-muted">{track.artist}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{timeAgo(track.createdAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{formatBytes(track.size)}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteTrackAction}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <button type="submit" className={SMALL_BUTTON}>
                        Удалить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-dim">
          Лимиты: {QUOTAS.tracksPerUser} треков и {formatBytes(QUOTAS.bytesPerUser)} на
          пользователя. Загрузки останавливаются, когда свободно меньше{' '}
          {formatBytes(QUOTAS.minFreeBytes)}.
        </p>
      </section>
    </div>
  )
}
