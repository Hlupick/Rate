'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, FileUp, Loader2, Music4 } from 'lucide-react'
import { parsePlaylistFile } from '@/lib/text'
import { cn } from '@/lib/utils'

type Mode = 'url' | 'file' | 'list'

type UrlPreview = {
  provider: 'deezer'
  sourceUrl: string
  name: string
  description: string | null
  coverUrl: string | null
  total: number
  rows: { title: string; artist: string }[]
  existingPlaylistId: string | null
}

type ImportResult = {
  playlistId: string | null
  name: string
  matched: number
  total: number
  missing: { title: string; artist: string }[]
}

export function ImportPlaylistForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<UrlPreview | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [copied, setCopied] = useState(false)

  const parsedRows = useMemo(
    () => parsePlaylistFile(text, fileName),
    [text, fileName],
  )
  const rows = mode === 'url' ? (preview?.rows ?? []) : parsedRows

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setMode('file')
    setFileName(file.name)
    setText(await file.text())
    setError(null)
    event.target.value = ''
  }

  async function checkUrl() {
    if (previewBusy || !url.trim()) return
    setPreviewBusy(true)
    setError(null)
    setExistingId(null)
    setPreview(null)
    try {
      const response = await fetch('/api/import/url/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = (await response.json().catch(() => ({}))) as UrlPreview & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось прочитать плейлист')
      setPreview(data)
      if (data.existingPlaylistId) setExistingId(data.existingPlaylistId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setPreviewBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return

    if (mode === 'url') {
      if (!preview) {
        setError('Сначала проверьте ссылку')
        return
      }
      if (preview.existingPlaylistId) {
        setExistingId(preview.existingPlaylistId)
        return
      }
    } else {
      if (!name.trim()) {
        setError('Введите название плейлиста')
        return
      }
      if (rows.length === 0) {
        setError('Не удалось распознать треки. Проверьте файл или список.')
        return
      }
    }

    setBusy(true)
    setError(null)
    setResult(null)
    setExistingId(null)

    const payload =
      mode === 'url' && preview
        ? {
            name: preview.name,
            description: preview.description ?? '',
            rows: preview.rows,
            sourceUrl: preview.sourceUrl,
            source: preview.provider,
            coverUrl: preview.coverUrl,
          }
        : { name: name.trim(), description, rows }

    try {
      const response = await fetch('/api/import/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as ImportResult & {
        error?: string
        playlistId?: string | null
      }
      if (!response.ok) {
        if (data.playlistId) setExistingId(data.playlistId)
        throw new Error(data.error ?? 'Не удалось импортировать')
      }
      setResult(data)
      if (data.playlistId) router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта')
    } finally {
      setBusy(false)
    }
  }

  async function copyMissing() {
    if (!result) return
    const value = result.missing
      .map((row) => `${row.title}${row.artist ? ` — ${row.artist}` : ''}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setText('')
    setFileName('')
    setName('')
    setDescription('')
    setUrl('')
    setPreview(null)
    setExistingId(null)
    setCopied(false)
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div
          className={cn(
            'rounded-xl border p-5',
            result.matched > 0
              ? 'border-white/15 bg-white/[0.05]'
              : 'border-amber-500/25 bg-amber-500/[0.06]',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {result.matched > 0 ? (
                <Check size={18} className="text-accent" />
              ) : (
                <AlertTriangle size={18} className="text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Плейлист создан</h2>
              <p className="mt-1 text-sm text-muted">
                Распознано {result.total} треков, добавлено {result.matched}, не загружено{' '}
                {result.missing.length}. Недостающие сохранены в плейлисте — когда появятся файлы,
                нажмите там «Проверить снова».
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.playlistId && (
                  <Link
                    href={`/playlist/${result.playlistId}`}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
                  >
                    Открыть плейлист
                  </Link>
                )}
                <Link
                  href="/upload"
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink"
                >
                  Загрузить недостающие
                </Link>
                <button
                  onClick={reset}
                  className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
                >
                  Импортировать ещё
                </button>
              </div>
            </div>
          </div>
        </div>

        {result.missing.length > 0 && (
          <div className="rounded-xl border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Не найдено в библиотеке</div>
                <div className="text-xs text-muted">
                  Записи сохранены в плейлисте как «не загружено». Загрузите файлы и нажмите
                  «Проверить снова».
                </div>
              </div>
              <button
                onClick={copyMissing}
                className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition hover:border-white/30 hover:text-ink"
              >
                {copied ? 'Скопировано' : 'Скопировать'}
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto px-4 py-3 text-sm">
              {result.missing.map((row, index) => (
                <li key={`${row.title}-${index}`} className="flex gap-2 py-1 text-muted">
                  <span className="w-6 shrink-0 text-right text-dim">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="text-ink">{row.title}</span>
                    {row.artist && <span> — {row.artist}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {mode !== 'url' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Название плейлиста
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Например, Ночная поездка"
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Описание{' '}
              <span className="normal-case tracking-normal text-dim">(необязательно)</span>
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
              placeholder="Откуда плейлист и для чего"
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
          </label>
        </div>
      )}

      <div className="flex gap-1 border-b border-white/5">
        {(
          [
            ['url', 'По ссылке'],
            ['file', 'CSV / M3U / JSON'],
            ['list', 'Список строк'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key)
              setError(null)
              setExistingId(null)
            }}
            className={cn(
              'relative px-3 py-2 text-sm font-medium transition',
              mode === key ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {label}
            {mode === key && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {mode === 'url' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                setPreview(null)
                setExistingId(null)
              }}
              placeholder="https://www.deezer.com/playlist/…"
              className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
            <button
              type="button"
              onClick={checkUrl}
              disabled={previewBusy || !url.trim()}
              className="flex items-center justify-center gap-2 rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40"
            >
              {previewBusy && <Loader2 size={15} className="animate-spin" />}
              {previewBusy ? 'Проверяем…' : 'Проверить ссылку'}
            </button>
          </div>
          <p className="text-xs text-dim">
            Переносятся только названия и исполнители. Аудио из Deezer не скачивается.
          </p>

          {preview && (
            <div className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-panel-2">
                  {preview.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.coverUrl}
                      alt={preview.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="eager"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-dim">
                      <Music4 size={22} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Deezer
                  </div>
                  <div className="truncate text-lg font-bold">{preview.name}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {preview.total} треков
                    {preview.description ? ` · ${preview.description}` : ''}
                  </div>
                  <ol className="mt-2 space-y-0.5 text-xs text-muted">
                    {preview.rows.slice(0, 5).map((row, index) => (
                      <li key={`${row.title}-${index}`} className="truncate">
                        {index + 1}. {row.title}
                        {row.artist ? ` — ${row.artist}` : ''}
                      </li>
                    ))}
                    {preview.rows.length > 5 && (
                      <li className="text-dim">и ещё {preview.rows.length - 5}…</li>
                    )}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {existingId && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-200/90">
              Этот плейлист уже импортирован.{' '}
              <Link href={`/playlist/${existingId}`} className="underline">
                Открыть его
              </Link>
            </div>
          )}
        </div>
      )}

      {mode === 'file' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink">
              <FileUp size={15} />
              Выбрать файл
              <input
                type="file"
                accept=".csv,.m3u,.m3u8,.json,.txt,text/csv,audio/x-mpegurl,application/json"
                className="hidden"
                onChange={onFile}
              />
            </label>
            <span className="text-xs text-dim">
              CSV из Exportify, M3U/M3U8 из плеера, JSON или TXT
            </span>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={
              '#EXTM3U\n#EXTINF:213,Monah Collective - Ночной трамвай\n\nили CSV:\nTrack Name,Artist Name(s)\nНочной трамвай,Monah Collective'
            }
            className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2.5 font-mono text-xs placeholder:text-dim focus:border-white/40"
          />
          {fileName && <p className="text-xs text-dim">Файл: {fileName}</p>}
        </div>
      )}

      {mode === 'list' && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder={
              'Ночной трамвай — Monah Collective\nСтеклянный дождь — Vela\nГравитация'
            }
            className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
          />
          <p className="text-xs text-dim">
            По одной строке: «Название — Исполнитель» или «Название&nbsp;Tab&nbsp;Исполнитель».
            Исполнителя можно не указывать, если название в библиотеке уникально.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Music4 size={16} />
          {mode === 'url'
            ? preview
              ? `Распознано треков: ${preview.total}`
              : 'Вставьте ссылку и проверьте её'
            : rows.length > 0
              ? `Распознано треков: ${rows.length}`
              : 'Треки пока не распознаны'}
        </div>
        <button
          type="submit"
          disabled={busy || rows.length === 0 || Boolean(existingId)}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? 'Импортируем…' : 'Импортировать'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </form>
  )
}
