'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'

export function PlaylistMenu({
  playlistId,
  name,
  description,
}: {
  playlistId: string
  name: string
  description: string | null
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [newName, setNewName] = useState(name)
  const [newDescription, setNewDescription] = useState(description ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!newName.trim()) return
    setBusy(true)
    await fetch(`/api/playlists/${playlistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
    })
    setBusy(false)
    setEditOpen(false)
    router.refresh()
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
              <Pencil size={15} /> Переименовать
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
          <div className="flex justify-end gap-2">
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
