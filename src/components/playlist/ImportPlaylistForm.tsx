'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2, Music2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ParsedFile = {
  name: string
  format: 'csv' | 'm3u'
  total: number
  rows: { title: string; artist: string }[]
}

export function ImportPlaylistForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [name, setName] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function pick(file: File | null | undefined) {
    if (!file) return
    setError('')
    setParsed(null)
    setFileName(file.name)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/import/file', { method: 'POST', body: form })
      const data = (await response.json().catch(() => ({}))) as ParsedFile & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось разобрать файл')
      setParsed(data)
      setName(data.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось разобрать файл')
    } finally {
      setLoading(false)
    }
  }

  async function create() {
    if (!parsed || importing) return
    setImporting(true)
    setError('')
    try {
      const response = await fetch('/api/import/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || parsed.name, rows: parsed.rows }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        playlistId?: string
        error?: string
      }
      if (!response.ok || !data.playlistId) {
        throw new Error(data.error ?? 'Не удалось создать плейлист')
      }
      router.push(`/playlist/${data.playlistId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать плейлист')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mt-6 max-w-2xl space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void pick(event.dataTransfer.files?.[0])
        }}
        className={cn(
          'rounded-xl border border-dashed p-6 text-center transition',
          dragging ? 'border-accent/60 bg-accent/5' : 'border-line bg-panel',
        )}
      >
        <FileUp size={28} className="mx-auto text-muted" />
        <p className="mt-3 text-sm font-medium">Перетащите файл сюда</p>
        <p className="mt-1 text-xs text-muted">CSV или M3U/M3U8, до 2 МБ и 2000 треков</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
        >
          Выбрать файл
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.m3u,.m3u8,text/csv,audio/x-mpegurl"
          className="hidden"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        {fileName && <p className="mt-2 truncate text-[11px] text-dim">{fileName}</p>}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Разбираем файл…
        </p>
      )}

      {error && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {parsed && (
        <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                Распознано {parsed.total} треков
                <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase text-dim">
                  {parsed.format === 'csv' ? 'CSV' : 'M3U'}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Совпавшие с библиотекой добавятся сразу, остальные попадут в список «Не загружено».
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setParsed(null)
                setFileName('')
                setName('')
                if (inputRef.current) inputRef.current.value = ''
              }}
              aria-label="Убрать файл"
              className="rounded-full p-1 text-dim transition hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Название плейлиста
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="input"
            />
          </label>

          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-2">
            {parsed.rows.slice(0, 60).map((row, index) => (
              <div key={`${row.title}-${row.artist}-${index}`} className="flex items-center gap-2 px-1 py-1">
                <Music2 size={13} className="shrink-0 text-dim" />
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {row.title}
                  {row.artist && <span className="text-dim"> — {row.artist}</span>}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void create()}
            disabled={importing || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
          >
            {importing && <Loader2 size={15} className="animate-spin" />}
            {importing ? 'Импортируем…' : 'Импортировать плейлист'}
          </button>
        </div>
      )}
    </div>
  )
}
