'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ImagePicker } from '@/components/ui/ImagePicker'

export function ProfileEditor({
  displayName,
  bio,
  avatar,
  cover,
}: {
  displayName: string
  bio: string | null
  avatar: string | null
  cover: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(displayName)
  const [about, setAbout] = useState(bio ?? '')
  const [newAvatar, setNewAvatar] = useState(avatar)
  const [newCover, setNewCover] = useState(cover)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (name.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: name.trim(),
          bio: about.trim() || null,
          avatar: newAvatar,
          cover: newCover,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сохранить')
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
      >
        <Pencil size={13} /> Редактировать профиль
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Редактировать профиль">
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <ImagePicker
            label="Аватар"
            shape="circle"
            maxSize={512}
            value={newAvatar}
            onChange={setNewAvatar}
          />
          <ImagePicker label="Обложка профиля" shape="banner" value={newCover} onChange={setNewCover} />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted" htmlFor="profile-name">
              Имя
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              className="input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted" htmlFor="profile-bio">
              О себе
            </label>
            <textarea
              id="profile-bio"
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              rows={3}
              maxLength={300}
              className="input resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
            >
              Отмена
            </button>
            <button
              onClick={() => void save()}
              disabled={busy || name.trim().length < 2}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
