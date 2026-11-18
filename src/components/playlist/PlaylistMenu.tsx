'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe2, Lock, Pencil, Trash2 } from 'lucide-react'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { ImagePicker } from '@/components/ui/ImagePicker'

export function PlaylistMenu({
  playlistId,
  name,
  description,
  avatar,
  cover,
  isPublic,
}: {
  playlistId: string
  name: string
  description: string | null
  avatar: string | null
  cover: string | null
  isPublic: boolean
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [newName, setNewName] = useState(name)
  const [newDescription, setNewDescription] = useState(description ?? '')
  const [newAvatar, setNewAvatar] = useState(avatar)
  const [newCover, setNewCover] = useState(cover)
  const [newPublic, setNewPublic] = useState(isPublic)
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!newName.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          avatar: newAvatar,
          cover: newCover,
          isPublic: newPublic,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сохранить')
      setEditOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  async function togglePrivacy() {
    if (privacyBusy) return
    setPrivacyBusy(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !newPublic }),
      })
      if (!response.ok) throw new Error('Не удалось изменить доступ')
      setNewPublic((value) => !value)
      router.refresh()
    } catch {
      /* the menu closes silently; the edit dialog still reports errors */
    } finally {
      setPrivacyBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Удалить плейлист «${name}»? Треки останутся в библиотеке.`)) return
    const response = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' })
    if (response.ok) {
      router.push('/library')
      router.refresh()
    }
  }

  return (
    <>
      <Menu>
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                close()
                setEditOpen(true)
              }}
            >
              <Pencil size={15} /> Изменить плейлист
            </MenuItem>
            <MenuItem
              onClick={() => {
                close()
                void togglePrivacy()
              }}
            >
              {newPublic ? <Lock size={15} /> : <Globe2 size={15} />}
              {newPublic ? 'Сделать приватным' : 'Сделать публичным'}
            </MenuItem>
            <div className="my-1 h-px bg-white/5" />
            <MenuItem danger onClick={remove}>
              <Trash2 size={15} /> Удалить плейлист
            </MenuItem>
          </>
        )}
      </Menu>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Изменить плейлист">
        <div className="space-y-4">
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            <ImagePicker
              label="Аватар плейлиста"
              maxSize={512}
              value={newAvatar}
              onChange={setNewAvatar}
            />
            <ImagePicker
              label="Обложка плейлиста"
              shape="banner"
              value={newCover}
              onChange={setNewCover}
            />
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={80}
              placeholder="Название"
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm focus:border-white/40"
            />
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Описание"
              className="w-full resize-none rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm focus:border-white/40"
            />
            <div className="flex items-start gap-3 rounded-md border border-line bg-panel-2 px-3 py-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={!newPublic}
                onClick={() => setNewPublic((value) => !value)}
                className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
                  !newPublic
                    ? 'border-amber-300/40 bg-amber-400/80'
                    : 'border-white/15 bg-black/40'
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 rounded-full bg-white shadow transition ${
                    !newPublic ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
              <div>
                <div className="text-sm font-medium text-ink">Приватный плейлист</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Виден только вам. Другие не найдут его и не откроют по ссылке.
                </p>
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
            >
              Отмена
            </button>
            <button
              onClick={save}
              disabled={busy || !newName.trim()}
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
