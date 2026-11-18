'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'

export function CreatePlaylistDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = (await response.json()) as { id?: string; error?: string }
      if (!response.ok || !data.id) throw new Error(data.error ?? 'Не удалось создать плейлист')
      setName('')
      setDescription('')
      onClose()
      router.push(`/playlist/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый плейлист"
      description="Дайте плейлисту имя — треки добавите позже."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Название
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Например, Поздний вечер"
            className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Описание <span className="normal-case tracking-normal text-dim">(необязательно)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Пара слов о настроении"
            className="w-full resize-none rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
          >
            {busy ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
