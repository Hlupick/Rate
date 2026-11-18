'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Music2, RefreshCw, Upload, X } from 'lucide-react'
import type { PlaylistDraft } from '@/lib/types'

export function PlaylistDrafts({
  playlistId,
  drafts,
  isOwner,
}: {
  playlistId: string
  drafts: PlaylistDraft[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (drafts.length === 0) return null

  async function remove(draftId: string) {
    setBusyId(draftId)
    await fetch(`/api/playlists/${playlistId}/drafts/${draftId}`, { method: 'DELETE' })
    setBusyId(null)
    router.refresh()
  }

  async function sync() {
    setSyncing(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/sync-drafts`, { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as { added?: number; left?: number }
      if (response.ok) {
        setMessage(
          data.added
            ? `Добавлено ${data.added}, осталось ${data.left ?? 0}. Загруженные треки появляются после одобрения модератором.`
            : 'Новых одобренных треков пока нет',
        )
        router.refresh()
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Не загружено · {drafts.length}</h2>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted">
            Эти треки есть в импортированном списке, но их файлов пока нет в библиотеке. Загрузите
            их через «Загрузить», дождитесь одобрения и нажмите «Проверить снова».
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
            >
              <Upload size={13} /> Загрузить файлы
            </Link>
            <button
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40"
            >
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Проверить снова
            </button>
          </div>
        )}
      </div>

      {message && <p className="mb-2 text-xs text-amber-200">{message}</p>}

      <div className="space-y-0.5">
        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-white/5 md:px-3"
          >
            <span className="w-5 shrink-0 text-right text-[13px] tabular-nums text-dim">
              {index + 1}
            </span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-dim">
              <Music2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] text-muted">{draft.title}</div>
              {draft.artist && <div className="truncate text-[12px] text-dim">{draft.artist}</div>}
            </div>
            <span className="hidden shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-dim sm:inline">
              нет файла
            </span>
            {isOwner && (
              <button
                onClick={() => void remove(draft.id)}
                disabled={busyId === draft.id}
                aria-label="Убрать из списка"
                className="rounded p-1 text-dim opacity-0 transition hover:text-ink group-hover:opacity-100 disabled:opacity-40"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
