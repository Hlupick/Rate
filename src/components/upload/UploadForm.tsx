'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unzip, type UnzipFileInfo } from 'fflate'
import { Check, FileAudio, Loader2, Music4, Trash2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED = ['.mp3', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.wav']
const MAX_SIZE = 50 * 1024 * 1024
const MAX_BATCH = 250 * 1024 * 1024
const MAX_FILES = 100

type Item = {
  key: string
  file: File
  title: string
  artist: string
  album: string
  status: 'idle' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  trackId?: string
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
}

function cleanName(value: string) {
  const base = value.split(/[\\/]/).pop() ?? ''
  return base.replace(/^\d+[\s.\-–—_]+/, '').trim()
}

function itemKey(name: string, size: number) {
  return `${name}-${size}-${Math.random().toString(36).slice(2, 7)}`
}

export function UploadForm({ defaultArtist }: { defaultArtist?: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpacking, setUnpacking] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setUnpacking(true)
      try {
        const list = Array.from(files)
        const candidates: Item[] = []
        const rejected: string[] = []

        for (const file of list) {
          const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

          if (ext === '.zip') {
            if (file.size > MAX_BATCH) {
              rejected.push(`${file.name} — архив больше 250 МБ`)
              continue
            }
            try {
              const bytes = new Uint8Array(await file.arrayBuffer())
              let planned = 0
              const skipped: string[] = []
              const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
                unzip(
                  bytes,
                  {
                    filter: (info: UnzipFileInfo) => {
                      const name = cleanName(info.name)
                      const fileExt = `.${name.split('.').pop()?.toLowerCase() ?? ''}`
                      if (!name || name.startsWith('.') || !ACCEPTED.includes(fileExt)) return false
                      if (info.originalSize === 0) {
                        skipped.push(`${name} — пустой файл`)
                        return false
                      }
                      if (info.originalSize > MAX_SIZE) {
                        skipped.push(`${name} — больше 50 МБ`)
                        return false
                      }
                      if (planned + info.originalSize > MAX_BATCH) {
                        skipped.push(`${name} — суммарно больше 250 МБ`)
                        return false
                      }
                      planned += info.originalSize
                      return true
                    },
                  },
                  (error, entries) => (error ? reject(error) : resolve(entries)),
                )
              })
              const names = Object.keys(extracted).sort((a, b) => a.localeCompare(b, 'ru'))
              if (names.length === 0) {
                rejected.push(`${file.name} — в архиве нет подходящих аудиофайлов`)
              } else {
                for (const name of names) {
                  const fileName = cleanName(name)
                  const data = new Uint8Array(extracted[name])
                  candidates.push({
                    key: itemKey(fileName, data.length),
                    file: new File([data as BlobPart], fileName, { type: 'application/octet-stream' }),
                    title: baseName(fileName),
                    artist: defaultArtist ?? '',
                    album: '',
                    status: 'idle',
                    progress: 0,
                  })
                }
              }
              if (skipped.length > 0) rejected.push(...skipped)
            } catch {
              rejected.push(`${file.name} — не удалось распаковать архив`)
            }
            continue
          }

          if (!ACCEPTED.includes(ext)) {
            rejected.push(`${file.name} — формат не поддерживается`)
            continue
          }
          if (file.size > MAX_SIZE) {
            rejected.push(`${file.name} — больше 50 МБ`)
            continue
          }
          candidates.push({
            key: itemKey(file.name, file.size),
            file,
            title: baseName(file.name),
            artist: defaultArtist ?? '',
            album: '',
            status: 'idle',
            progress: 0,
          })
        }

        let count = items.length
        let bytes = items.reduce((sum, item) => sum + item.file.size, 0)
        const accepted: Item[] = []
        for (const item of candidates) {
          if (count >= MAX_FILES) {
            rejected.push(`${item.file.name} — лимит ${MAX_FILES} файлов`)
            continue
          }
          if (bytes + item.file.size > MAX_BATCH) {
            rejected.push(`${item.file.name} — суммарно больше 250 МБ`)
            continue
          }
          bytes += item.file.size
          count += 1
          accepted.push(item)
        }

        setNote(rejected.length > 0 ? rejected.join(' · ') : null)
        if (accepted.length > 0) setItems((prev) => [...prev, ...accepted])
      } finally {
        setUnpacking(false)
      }
    },
    [defaultArtist, items],
  )

  function update(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  function uploadOne(item: Item) {
    return new Promise<void>((resolve) => {
      update(item.key, { status: 'uploading', progress: 0, error: undefined })
      const form = new FormData()
      form.append('file', item.file)
      if (item.title.trim()) form.append('title', item.title.trim())
      if (item.artist.trim()) form.append('artist', item.artist.trim())
      if (item.album.trim()) form.append('album', item.album.trim())

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload')
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          update(item.key, { progress: Math.round((event.loaded / event.total) * 100) })
        }
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as {
            track?: { id: string }
            error?: string
          }
          if (xhr.status >= 200 && xhr.status < 300 && data.track) {
            update(item.key, { status: 'done', progress: 100, trackId: data.track.id })
          } else {
            update(item.key, { status: 'error', error: data.error ?? 'Не удалось загрузить' })
          }
        } catch {
          update(item.key, { status: 'error', error: 'Сервер вернул неожиданный ответ' })
        }
        resolve()
      }
      xhr.onerror = () => {
        update(item.key, { status: 'error', error: 'Сетевая ошибка' })
        resolve()
      }
      xhr.send(form)
    })
  }

  async function publishAll() {
    if (publishing) return
    setPublishing(true)
    for (const item of items) {
      if (item.status === 'idle' || item.status === 'error') {
        await uploadOne(item)
      }
    }
    setPublishing(false)
    router.refresh()
  }

  const pending = items.filter((item) => item.status === 'idle' || item.status === 'error')
  const done = items.filter((item) => item.status === 'done').length

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
          dragging
            ? 'border-white/60 bg-white/[0.06]'
            : 'border-line bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]',
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card">
          <UploadCloud size={24} className="text-ink" />
        </div>
        <p className="text-[15px] font-semibold">
          {unpacking ? 'Распаковываем архив…' : 'Перетащите файлы сюда'}
        </p>
        <p className="mt-1 text-sm text-muted">
          {unpacking ? 'Это займёт несколько секунд' : 'или нажмите, чтобы выбрать на диске'}
        </p>
        <p className="mt-3 text-xs text-dim">
          MP3, M4A, AAC, OGG, OPUS, FLAC, WAV или ZIP с треками · до 50 МБ на трек, 250 МБ за раз
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={[...ACCEPTED, '.zip'].join(',')}
          multiple
          className="hidden"
          disabled={unpacking}
          onChange={(event) => {
            if (event.target.files?.length) void addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {note && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
          <X size={14} className="mt-0.5 shrink-0" />
          <span>{note}</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-line bg-panel-2 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-card text-muted">
                  {item.status === 'done' ? (
                    <Check size={18} className="text-accent" />
                  ) : (
                    <FileAudio size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium">{item.file.name}</div>
                    <span className="shrink-0 text-[11px] text-dim">
                      {(item.file.size / 1024 / 1024).toFixed(1)} МБ
                    </span>
                    {item.status === 'uploading' && (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                        <Loader2 size={12} className="animate-spin" /> {item.progress}%
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="shrink-0 text-[11px] text-accent">опубликован</span>
                    )}
                  </div>

                  {item.status === 'done' ? (
                    <p className="mt-1 text-xs text-muted">
                      Трек появился в библиотеке.{' '}
                      {item.trackId && (
                        <a href={`/track/${item.trackId}`} className="underline hover:text-ink">
                          Открыть
                        </a>
                      )}
                    </p>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input
                        value={item.title}
                        onChange={(event) => update(item.key, { title: event.target.value })}
                        placeholder="Название"
                        className="rounded border border-line bg-panel px-2.5 py-1.5 text-xs placeholder:text-dim focus:border-white/30"
                      />
                      <input
                        value={item.artist}
                        onChange={(event) => update(item.key, { artist: event.target.value })}
                        placeholder="Исполнитель"
                        className="rounded border border-line bg-panel px-2.5 py-1.5 text-xs placeholder:text-dim focus:border-white/30"
                      />
                      <input
                        value={item.album}
                        onChange={(event) => update(item.key, { album: event.target.value })}
                        placeholder="Альбом (необязательно)"
                        className="rounded border border-line bg-panel px-2.5 py-1.5 text-xs placeholder:text-dim focus:border-white/30"
                      />
                    </div>
                  )}

                  {item.error && <p className="mt-1.5 text-xs text-red-400">{item.error}</p>}

                  {item.status === 'uploading' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {item.status !== 'uploading' && (
                  <button
                    onClick={() => remove(item.key)}
                    className="rounded p-1 text-dim transition hover:text-ink"
                    aria-label="Убрать файл"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted">
              Если оставить название и исполнителя пустыми, они будут взяты из тегов файла.
            </p>
            <button
              onClick={publishAll}
              disabled={publishing || pending.length === 0}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
            >
              {publishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Music4 size={16} />
              )}
              {publishing
                ? 'Публикуем…'
                : `Опубликовать ${pending.length > 0 ? pending.length : ''}`.trim()}
            </button>
          </div>
          {done > 0 && (
            <p className="text-xs text-muted">
              Готово: {done} из {items.length}. Загруженные треки доступны всем слушателям.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
