import Link from 'next/link'
import type { Metadata } from 'next'
import { ListPlus, LogIn } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { EmptyState } from '@/components/ui/Section'
import { ImportPlaylistForm } from '@/components/playlist/ImportPlaylistForm'

export const metadata: Metadata = { title: 'Импорт плейлиста' }

export default async function ImportPage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Импорт плейлиста</h1>
        <div className="mt-8">
          <EmptyState
            icon={<LogIn size={24} />}
            title="Нужен аккаунт"
            description="Войдите, чтобы импортировать плейлист в свою медиатеку."
            action="Войти"
            href="/login"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 md:px-6">
      <div className="pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Медиатека
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          <ListPlus size={26} /> Импорт плейлиста
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Вставьте ссылку на публичный плейлист <strong className="text-ink">Deezer</strong> — monah
          перенесёт названия и исполнителей и создаст плейлист. Также можно загрузить файл плейлиста
          (M3U/M3U8, JSON, CSV) или список строк. Совпавшие с библиотекой треки станут играбельными,
          остальные сохранятся как «не загружено». Аудио из сервисов не скачивается.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-card p-4 text-sm leading-relaxed text-muted">
        <div className="mb-2 font-semibold text-ink">Другие способы</div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Экспортируйте плейлист из своего плеера в M3U/M3U8, JSON или CSV и загрузите файл во
            вкладке «CSV / M3U / JSON».
          </li>
          <li>Или вставьте список строк вида «Название — Исполнитель» во вкладке «Список строк».</li>
          <li>Форматы файлов: CSV, M3U, M3U8, JSON, TXT.</li>
        </ol>
      </div>

      <div className="mt-6">
        <ImportPlaylistForm />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-dim">
        <Link href="/upload" className="underline transition hover:text-muted">
          Загрузить треки
        </Link>
        <Link href="/library" className="underline transition hover:text-muted">
          Моя медиатека
        </Link>
        <Link href="/rules" className="underline transition hover:text-muted">
          Правила загрузки
        </Link>
      </div>
    </div>
  )
}
