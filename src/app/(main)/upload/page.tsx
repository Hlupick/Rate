import Link from 'next/link'
import { Music2, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { listTracks, userUploadStats } from '@/lib/queries'
import { QUOTAS, formatBytes } from '@/lib/storage'
import { UploadForm } from '@/components/upload/UploadForm'
import { InviteGate } from '@/components/upload/InviteGate'
import { TrackList } from '@/components/track/TrackList'
import { EmptyState } from '@/components/ui/Section'

export const metadata: Metadata = { title: 'Загрузить трек' }

export default async function UploadPage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Загрузить трек</h1>
        <div className="mt-8">
          <EmptyState
            icon={<Music2 size={24} />}
            title="Нужен аккаунт"
            description="Загружать музыку могут только зарегистрированные слушатели — так видно, кто добавил трек."
            action="Войти"
            href="/login"
          />
        </div>
      </div>
    )
  }

  const canUpload = user.canUpload || user.isAdmin
  const stats = userUploadStats(user.id)
  const uploads = listTracks({
    uploaderId: user.id,
    viewerId: user.id,
    reviewStatus: 'all',
    limit: 5,
  })

  return (
    <div className="px-4 md:px-6">
      <div className="max-w-4xl pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Библиотека
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Загрузить трек</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Добавьте свою музыку в общую библиотеку Rate. Название, исполнитель и альбом
          подтягиваются из тегов файла, но всё можно поправить перед публикацией.
        </p>

        {canUpload ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5 text-ink">
                <ShieldCheck size={14} /> Доступ к загрузке активен
              </span>
              <span>
                Треков: {stats.count} из {QUOTAS.tracksPerUser}
              </span>
              <span>
                Место: {formatBytes(stats.bytes)} из {formatBytes(QUOTAS.bytesPerUser)}
              </span>
              {user.isAdmin && (
                <Link href="/admin" className="underline transition hover:text-ink">
                  Админка
                </Link>
              )}
            </div>
            <div className="mt-5">
              <UploadForm />
            </div>
          </>
        ) : (
          <div className="mt-5">
            <InviteGate username={user.displayName} />
          </div>
        )}

        {uploads.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-3 text-lg font-bold">Последние загрузки</h2>
            <TrackList tracks={uploads} viewerId={user.id} label="Мои загрузки" showDate />
          </div>
        )}

        <div className="mt-10 grid gap-3 border-t border-white/5 pt-6 text-xs text-muted sm:grid-cols-3">
          <div>
            <div className="mb-1 font-semibold text-ink">Форматы</div>
            MP3, M4A, AAC, OGG, OPUS, FLAC, WAV или ZIP-архив с треками. MP3 и M4A играют во всех
            браузерах.
          </div>
          <div>
            <div className="mb-1 font-semibold text-ink">Лимиты</div>
            50 МБ на трек, до 250 МБ за один заход. Архивы распаковываются в браузере, треки
            проверяются по содержимому.
          </div>
          <div>
            <div className="mb-1 font-semibold text-ink">Что дальше</div>
            Трек отправляется модератору. После одобрения он появится в «Новых загрузках» на
            главной, в поиске и в плейлистах.
          </div>
        </div>
      </div>
    </div>
  )
}
