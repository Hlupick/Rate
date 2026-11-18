'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TrackList } from './TrackList'
import type { Track } from '@/lib/types'

type TracksPagerProps = {
  initialTracks: Track[]
  initialHasMore?: boolean
  params: Record<string, string | undefined>
  viewerId?: string | null
  label?: string
  showAlbum?: boolean
  showDate?: boolean
}

/**
 * "Show more" over GET /api/tracks. Keeps the server-rendered list and appends
 * fresh pages, so search/library/artist pages are not capped at one page.
 */
export function TracksPager({
  initialTracks,
  initialHasMore = false,
  params,
  viewerId,
  label,
  showAlbum,
  showDate,
}: TracksPagerProps) {
  const [extra, setExtra] = useState<Track[]>([])
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const tracks = extra.length > 0 ? [...initialTracks, ...extra] : initialTracks

  async function loadMore() {
    if (busy || !hasMore) return
    setBusy(true)
    setError('')
    try {
      const search = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value) search.set(key, value)
      }
      search.set('offset', String(tracks.length))
      const response = await fetch(`/api/tracks?${search.toString()}`)
      const data = (await response.json().catch(() => ({}))) as {
        tracks?: Track[]
        hasMore?: boolean
        error?: string
      }
      if (!response.ok || !data.tracks) {
        throw new Error(data.error ?? 'Не удалось загрузить треки')
      }
      setExtra((current) => [...current, ...data.tracks!])
      setHasMore(Boolean(data.hasMore))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <TrackList
        tracks={tracks}
        viewerId={viewerId}
        label={label}
        showAlbum={showAlbum}
        showDate={showDate}
      />
      {(hasMore || error) && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={loadMore}
            disabled={busy || !hasMore}
            className="flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Загружаем…' : 'Показать ещё'}
          </button>
        </div>
      )}
    </div>
  )
}
