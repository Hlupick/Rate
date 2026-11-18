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
      if (!response.ok) throw new Error(data.error ?? 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ РїР»РµР№Р»РёСЃС‚')
      setPreview(data)
      if (data.existingPlaylistId) setExistingId(data.existingPlaylistId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'РћС€РёР±РєР°')
    } finally {
      setPreviewBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return

    if (mode === 'url') {
      if (!preview) {
        setError('РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЊС‚Рµ СЃСЃС‹Р»РєСѓ')
        return
      }
      if (preview.existingPlaylistId) {
        setExistingId(preview.existingPlaylistId)
        return
      }
    } else {
      if (!name.trim()) {
        setError('Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РїР»РµР№Р»РёСЃС‚Р°')
        return
      }
      if (rows.length === 0) {
        setError('РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃРїРѕР·РЅР°С‚СЊ С‚СЂРµРєРё. РџСЂРѕРІРµСЂСЊС‚Рµ С„Р°Р№Р» РёР»Рё СЃРїРёСЃРѕРє.')
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
        throw new Error(data.error ?? 'РќРµ СѓРґР°Р»РѕСЃСЊ РёРјРїРѕСЂС‚РёСЂРѕРІР°С‚СЊ')
      }
      setResult(data)
      if (data.playlistId) router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'РћС€РёР±РєР° РёРјРїРѕСЂС‚Р°')
    } finally {
      setBusy(false)
    }
  }

  async function copyMissing() {
    if (!result) return
    const value = result.missing
      .map((row) => `${row.title}${row.artist ? ` вЂ” ${row.artist}` : ''}`)
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
              <h2 className="text-lg font-bold">РџР»РµР№Р»РёСЃС‚ СЃРѕР·РґР°РЅ</h2>
              <p className="mt-1 text-sm text-muted">
                Р Р°СЃРїРѕР·РЅР°РЅРѕ {result.total} С‚СЂРµРєРѕРІ, РґРѕР±Р°РІР»РµРЅРѕ {result.matched}, РЅРµ Р·Р°РіСЂСѓР¶РµРЅРѕ{' '}
                {result.missing.length}. РќРµРґРѕСЃС‚Р°СЋС‰РёРµ СЃРѕС…СЂР°РЅРµРЅС‹ РІ РїР»РµР№Р»РёСЃС‚Рµ вЂ” РєРѕРіРґР° РїРѕСЏРІСЏС‚СЃСЏ С„Р°Р№Р»С‹,
                РЅР°Р¶РјРёС‚Рµ С‚Р°Рј В«РџСЂРѕРІРµСЂРёС‚СЊ СЃРЅРѕРІР°В».
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.playlistId && (
                  <Link
                    href={`/playlist/${result.playlistId}`}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
                  >
                    РћС‚РєСЂС‹С‚СЊ РїР»РµР№Р»РёСЃС‚
                  </Link>
                )}
                <Link
                  href="/upload"
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink"
                >
                  Р—Р°РіСЂСѓР·РёС‚СЊ РЅРµРґРѕСЃС‚Р°СЋС‰РёРµ
                </Link>
                <button
                  onClick={reset}
                  className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
                >
                  РРјРїРѕСЂС‚РёСЂРѕРІР°С‚СЊ РµС‰С‘
                </button>
              </div>
            </div>
          </div>
        </div>

        {result.missing.length > 0 && (
          <div className="rounded-xl border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">РќРµ РЅР°Р№РґРµРЅРѕ РІ Р±РёР±Р»РёРѕС‚РµРєРµ</div>
                <div className="text-xs text-muted">
                  Р—Р°РїРёСЃРё СЃРѕС…СЂР°РЅРµРЅС‹ РІ РїР»РµР№Р»РёСЃС‚Рµ РєР°Рє В«РЅРµ Р·Р°РіСЂСѓР¶РµРЅРѕВ». Р—Р°РіСЂСѓР·РёС‚Рµ С„Р°Р№Р»С‹ Рё РЅР°Р¶РјРёС‚Рµ
                  В«РџСЂРѕРІРµСЂРёС‚СЊ СЃРЅРѕРІР°В».
                </div>
              </div>
              <button
                onClick={copyMissing}
                className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition hover:border-white/30 hover:text-ink"
              >
                {copied ? 'РЎРєРѕРїРёСЂРѕРІР°РЅРѕ' : 'РЎРєРѕРїРёСЂРѕРІР°С‚СЊ'}
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto px-4 py-3 text-sm">
              {result.missing.map((row, index) => (
                <li key={`${row.title}-${index}`} className="flex gap-2 py-1 text-muted">
                  <span className="w-6 shrink-0 text-right text-dim">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="text-ink">{row.title}</span>
                    {row.artist && <span> вЂ” {row.artist}</span>}
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
              РќР°Р·РІР°РЅРёРµ РїР»РµР№Р»РёСЃС‚Р°
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="РќР°РїСЂРёРјРµСЂ, РќРѕС‡РЅР°СЏ РїРѕРµР·РґРєР°"
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              РћРїРёСЃР°РЅРёРµ{' '}
              <span className="normal-case tracking-normal text-dim">(РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</span>
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
              placeholder="РћС‚РєСѓРґР° РїР»РµР№Р»РёСЃС‚ Рё РґР»СЏ С‡РµРіРѕ"
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
          </label>
        </div>
      )}

      <div className="flex gap-1 border-b border-white/5">
        {(
          [
            ['url', 'РџРѕ СЃСЃС‹Р»РєРµ'],
            ['file', 'CSV / M3U / JSON'],
            ['list', 'РЎРїРёСЃРѕРє СЃС‚СЂРѕРє'],
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
              placeholder="https://www.deezer.com/playlist/вЂ¦"
              className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
            />
            <button
              type="button"
              onClick={checkUrl}
              disabled={previewBusy || !url.trim()}
              className="flex items-center justify-center gap-2 rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40"
            >
              {previewBusy && <Loader2 size={15} className="animate-spin" />}
              {previewBusy ? 'РџСЂРѕРІРµСЂСЏРµРјвЂ¦' : 'РџСЂРѕРІРµСЂРёС‚СЊ СЃСЃС‹Р»РєСѓ'}
            </button>
          </div>
          <p className="text-xs text-dim">
            РџРµСЂРµРЅРѕСЃСЏС‚СЃСЏ С‚РѕР»СЊРєРѕ РЅР°Р·РІР°РЅРёСЏ Рё РёСЃРїРѕР»РЅРёС‚РµР»Рё. РђСѓРґРёРѕ РёР· Deezer РЅРµ СЃРєР°С‡РёРІР°РµС‚СЃСЏ.
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
                    {preview.total} С‚СЂРµРєРѕРІ
                    {preview.description ? ` В· ${preview.description}` : ''}
                  </div>
                  <ol className="mt-2 space-y-0.5 text-xs text-muted">
                    {preview.rows.slice(0, 5).map((row, index) => (
                      <li key={`${row.title}-${index}`} className="truncate">
                        {index + 1}. {row.title}
                        {row.artist ? ` вЂ” ${row.artist}` : ''}
                      </li>
                    ))}
                    {preview.rows.length > 5 && (
                      <li className="text-dim">Рё РµС‰С‘ {preview.rows.length - 5}вЂ¦</li>
                    )}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {existingId && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-200/90">
              Р­С‚РѕС‚ РїР»РµР№Р»РёСЃС‚ СѓР¶Рµ РёРјРїРѕСЂС‚РёСЂРѕРІР°РЅ.{' '}
              <Link href={`/playlist/${existingId}`} className="underline">
                РћС‚РєСЂС‹С‚СЊ РµРіРѕ
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
              Р’С‹Р±СЂР°С‚СЊ С„Р°Р№Р»
              <input
                type="file"
                accept=".csv,.m3u,.m3u8,.json,.txt,text/csv,audio/x-mpegurl,application/json"
                className="hidden"
                onChange={onFile}
              />
            </label>
            <span className="text-xs text-dim">
              CSV РёР· Exportify, M3U/M3U8 РёР· РїР»РµРµСЂР°, JSON РёР»Рё TXT
            </span>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={
              '#EXTM3U\n#EXTINF:213,Rate Collective - РќРѕС‡РЅРѕР№ С‚СЂР°РјРІР°Р№\n\nРёР»Рё CSV:\nTrack Name,Artist Name(s)\nРќРѕС‡РЅРѕР№ С‚СЂР°РјРІР°Р№,Rate Collective'
            }
            className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2.5 font-mono text-xs placeholder:text-dim focus:border-white/40"
          />
          {fileName && <p className="text-xs text-dim">Р¤Р°Р№Р»: {fileName}</p>}
        </div>
      )}

      {mode === 'list' && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder={
              'РќРѕС‡РЅРѕР№ С‚СЂР°РјРІР°Р№ вЂ” Rate Collective\nРЎС‚РµРєР»СЏРЅРЅС‹Р№ РґРѕР¶РґСЊ вЂ” Vela\nР“СЂР°РІРёС‚Р°С†РёСЏ'
            }
            className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
          />
          <p className="text-xs text-dim">
            РџРѕ РѕРґРЅРѕР№ СЃС‚СЂРѕРєРµ: В«РќР°Р·РІР°РЅРёРµ вЂ” РСЃРїРѕР»РЅРёС‚РµР»СЊВ» РёР»Рё В«РќР°Р·РІР°РЅРёРµ&nbsp;Tab&nbsp;РСЃРїРѕР»РЅРёС‚РµР»СЊВ».
            РСЃРїРѕР»РЅРёС‚РµР»СЏ РјРѕР¶РЅРѕ РЅРµ СѓРєР°Р·С‹РІР°С‚СЊ, РµСЃР»Рё РЅР°Р·РІР°РЅРёРµ РІ Р±РёР±Р»РёРѕС‚РµРєРµ СѓРЅРёРєР°Р»СЊРЅРѕ.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Music4 size={16} />
          {mode === 'url'
            ? preview
              ? `Р Р°СЃРїРѕР·РЅР°РЅРѕ С‚СЂРµРєРѕРІ: ${preview.total}`
              : 'Р’СЃС‚Р°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ Рё РїСЂРѕРІРµСЂСЊС‚Рµ РµС‘'
            : rows.length > 0
              ? `Р Р°СЃРїРѕР·РЅР°РЅРѕ С‚СЂРµРєРѕРІ: ${rows.length}`
              : 'РўСЂРµРєРё РїРѕРєР° РЅРµ СЂР°СЃРїРѕР·РЅР°РЅС‹'}
        </div>
        <button
          type="submit"
          disabled={busy || rows.length === 0 || Boolean(existingId)}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? 'РРјРїРѕСЂС‚РёСЂСѓРµРјвЂ¦' : 'РРјРїРѕСЂС‚РёСЂРѕРІР°С‚СЊ'}
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
