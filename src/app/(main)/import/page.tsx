import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { ImportPlaylistForm } from '@/components/playlist/ImportPlaylistForm'

export const metadata: Metadata = { title: 'Импорт плейлиста' }

export default async function ImportPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="px-4 pb-10 pt-2 md:px-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
      >
        <ArrowLeft size={13} /> В медиатеку
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Импорт плейлиста</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Загрузите CSV из Exportify или M3U из плеера. Треки, которые уже есть в Rate, добавятся
        сразу, остальные появятся списком «Не загружено» — их можно постепенно добавить файлами.
      </p>

      <ImportPlaylistForm />

      <div className="mt-8 max-w-2xl rounded-xl border border-line bg-panel/60 p-4 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink">Откуда взять файл</p>
        <p className="mt-1">
          Spotify — экспорт через{' '}
          <a
            href="https://exportify.net/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            Exportify
          </a>
          : войдите, выберите плейлист или «Liked Songs», нажмите Export и загрузите CSV.
        </p>
        <p className="mt-1">
          Другие сервисы — подойдёт любой CSV с колонками названия и исполнителя (Title / Artist,
          Название / Исполнитель). M3U можно взять из большинства плееров.
        </p>
        <p className="mt-1 text-dim">Файл не сохраняется: сервер только читает список треков.</p>
      </div>
    </div>
  )
}
