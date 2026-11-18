'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, FileUp, Loader2, Music4 } from 'lucide-react'
import { parseImportCsv, parseImportLines } from '@/lib/text'
import { cn } from '@/lib/utils'

type ImportResult = {
  playlistId: string | null
  name: string
  matched: number
  total: number
  missing: { title: string; artist: string }[]
}

export function ImportPlaylistForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'csv' | 'list'>('csv')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [copied, setCopied] = useState(false)

  const rows = useMemo(
    () => (mode === 'csv' ? parseImportCsv(text) : parseImportLines(text)),
    [mode, text],
  )

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setMode('csv')
    setText(await file.text())
    setError(null)
    event.target.value = ''
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setError('Введите название плейлиста')
      return
    }
    if (rows.length === 0) {
      setError('Не удалось распознать треки. Проверьте файл или список.')
      return
    }

    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/import/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, rows }),
      })
      const data = (await response.json().catch(() => ({}))) as ImportResult & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось импортировать')
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
    const value = result.missing.map((row) => `${row.title}${row.artist ? ` — ${row.artist}` : ''}`).join('\n')
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
    setName('')
    setDescription('')
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
            Описание <span className="normal-case tracking-normal text-dim">(необязательно)</span>
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

      <div className="flex gap-1 border-b border-white/5">
        <button
          type="button"
          onClick={() => setMode('csv')}
          className={cn(
            'relative px-3 py-2 text-sm font-medium transition',
            mode === 'csv' ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          CSV из Exportify
          {mode === 'csv' && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
        </button>
        <button
          type="button"
          onClick={() => setMode('list')}
          className={cn(
            'relative px-3 py-2 text-sm font-medium transition',
            mode === 'list' ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          Список строк
          {mode === 'list' && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
        </button>
      </div>

      {mode === 'csv' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink">
              <FileUp size={15} />
              Выбрать CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
            <span className="text-xs text-dim">
              или вставь содержимое CSV в поле ниже
            </span>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={'Track Name,Artist Name(s),Album Name\nНочной трамвай,Monah Collective,Ночные линии'}
            className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2.5 font-mono text-xs placeholder:text-dim focus:border-white/40"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder={'Ночной трамвай — Monah Collective\nСтеклянный дождь — Vela\nГравитация'}
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
          {rows.length > 0 ? `Распознано треков: ${rows.length}` : 'Треки пока не распознаны'}
        </div>
        <button
          type="submit"
          disabled={busy || rows.length === 0}
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
