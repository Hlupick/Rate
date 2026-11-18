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
          Перенесите плейлист по списку треков: monah найдёт совпадения в библиотеке и создаст
          плейлист в том же порядке. Музыку из Spotify мы не копируем — только названия и
          исполнителей; недостающие треки нужно загрузить файлами, на которые у вас есть права.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-card p-4 text-sm leading-relaxed text-muted">
        <div className="mb-2 font-semibold text-ink">Как выгрузить плейлист из Spotify</div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Откройте{' '}
            <a
              href="https://exportify.net"
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink underline underline-offset-2"
            >
              exportify.net
            </a>{' '}
            и войдите через свой Spotify.
          </li>
          <li>Выберите плейлист и нажмите Export — скачается CSV-файл.</li>
          <li>Загрузите этот CSV ниже, укажите название и запустите импорт.</li>
        </ol>
        <p className="mt-2 text-xs text-dim">
          Можно и без Exportify: вставьте список строк вручную во вкладке «Список строк».
        </p>
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
