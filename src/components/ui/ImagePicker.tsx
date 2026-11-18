'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { coverUrl } from '@/lib/format'
import { prepareImage } from '@/lib/image-client'
import { cn } from '@/lib/utils'

export function ImagePicker({
  value,
  onChange,
  label,
  shape = 'square',
  maxSize = 1600,
}: {
  value: string | null
  onChange: (value: string | null) => void
  label: string
  shape?: 'square' | 'circle' | 'banner'
  maxSize?: number
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const url = coverUrl(value)

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const prepared = await prepareImage(file, maxSize)
      const form = new FormData()
      form.append('file', prepared)
      const response = await fetch('/api/images', { method: 'POST', body: form })
      const data = (await response.json()) as { file?: string; error?: string }
      if (!response.ok || !data.file) throw new Error(data.error ?? 'Не удалось загрузить')
      onChange(data.file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const previewShape =
    shape === 'circle' ? 'h-24 w-24 rounded-full' : shape === 'banner' ? 'h-28 w-full rounded-lg' : 'h-24 w-24 rounded-lg'

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'relative shrink-0 overflow-hidden border border-line bg-panel-2',
            previewShape,
          )}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dim">
              <ImagePlus size={22} />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 size={20} className="animate-spin text-ink" />
            </div>
          )}
          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Удалить изображение"
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-ink transition hover:bg-black"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-line px-3.5 py-2 text-xs font-medium text-ink transition hover:border-white/40 disabled:opacity-40"
          >
            {value ? 'Заменить' : 'Загрузить'}
          </button>
          <p className="text-[11px] leading-relaxed text-dim">
            JPG, PNG или WebP. Картинка будет уменьшена до {maxSize} px.
          </p>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
