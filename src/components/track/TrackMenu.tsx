'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, ListMusic, ListPlus, Pencil, Plus, Share2, Trash2, CirclePlus, ArrowDown, ArrowUp } from 'lucide-react'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { usePlayer, type PlayerTrack } from '@/components/player/PlayerProvider'
import { Avatar } from '@/components/ui/Avatar'
import { TrackAvatar } from '@/components/track/TrackAvatar'
import { ShareDialog } from '@/components/social/ShareDialog'
import type { Track } from '@/lib/types'

export function TrackMenu({
  track,
  canDelete = false,
  canReport = false,
  playlistId,
  onRemoved,
  onMoveUp,
  onMoveDown,
}: {
  track: Track
  canDelete?: boolean
  canReport?: boolean
  playlistId?: string
  onRemoved?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const router = useRouter()
  const { playNext, addToQueue } = usePlayer()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  async function remove(close: () => void) {
    close()
    if (!confirm(`Удалить «${track.title}» из библиотеки?`)) return
    const response = await fetch(`/api/tracks/${track.id}`, { method: 'DELETE' })
    if (response.ok) {
      onRemoved?.()
      router.refresh()
    }
  }

  async function removeFromPlaylist(close: () => void) {
    close()
    if (!playlistId) return
    const response = await fetch(
      `/api/playlists/${playlistId}/tracks?trackId=${encodeURIComponent(track.id)}`,
      { method: 'DELETE' },
    )
    if (response.ok) {
      onRemoved?.()
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
                playNext(track)
              }}
            >
              <ListPlus size={15} /> Играть следующим
            </MenuItem>
            <MenuItem
              onClick={() => {
                close()
                addToQueue(track)
              }}
            >
              <ListMusic size={15} /> Добавить в очередь
            </MenuItem>
            <MenuItem
              onClick={() => {
                close()
                setDialogOpen(true)
              }}
            >
              <Plus size={15} /> Добавить в плейлист
            </MenuItem>
            <MenuItem
              onClick={() => {
                close()
                setShareOpen(true)
              }}
            >
              <Share2 size={15} /> Поделиться
            </MenuItem>
            {(onMoveUp || onMoveDown) && (
              <>
                <div className="my-1 h-px bg-white/5" />
                {onMoveUp && (
                  <MenuItem
                    onClick={() => {
                      close()
                      onMoveUp()
                    }}
                  >
                    <ArrowUp size={15} /> Выше в плейлисте
                  </MenuItem>
                )}
                {onMoveDown && (
                  <MenuItem
                    onClick={() => {
                      close()
                      onMoveDown()
                    }}
                  >
                    <ArrowDown size={15} /> Ниже в плейлисте
                  </MenuItem>
                )}
              </>
            )}
            {playlistId && (
              <>
                <div className="my-1 h-px bg-white/5" />
                <MenuItem danger onClick={() => removeFromPlaylist(close)}>
                  <Trash2 size={15} /> Убрать из плейлиста
                </MenuItem>
              </>
            )}
            {canReport && (
              <>
                <div className="my-1 h-px bg-white/5" />
                <MenuItem
                  onClick={() => {
                    close()
                    setReportOpen(true)
                  }}
                >
                  <Flag size={15} /> Пожаловаться
                </MenuItem>
              </>
            )}
            {canDelete && (
              <>
                <div className="my-1 h-px bg-white/5" />
                <MenuItem
                  onClick={() => {
                    close()
                    setEditOpen(true)
                  }}
                >
                  <Pencil size={15} /> Изменить трек
                </MenuItem>
                <MenuItem danger onClick={() => remove(close)}>
                  <Trash2 size={15} /> Удалить трек
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
      <AddToPlaylistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        track={track}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        type="track"
        id={track.id}
        title={`${track.title} — ${track.artist}`}
      />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} track={track} />
      <EditTrackDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        track={track}
        onSaved={() => router.refresh()}
      />
    </>
  )
}

const REPORT_REASONS = ['Копирайт', 'Спам', 'Неприемлемый контент', 'Другое']

function ReportDialog({
  open,
  onClose,
  track,
}: {
  open: boolean
  onClose: () => void
  track: Track
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSent(false)
      setError(null)
      setComment('')
      setReason(REPORT_REASONS[0])
    }
  }, [open])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, reason, comment }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось отправить жалобу')
      setSent(true)
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
      title="Пожаловаться на трек"
      description={`«${track.title}» — ${track.artist}`}
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-muted">
            Спасибо, жалоба отправлена. Администратор проверит трек и при необходимости удалит его.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {REPORT_REASONS.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition hover:bg-white/5"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                  className="accent-white"
                />
                {item}
              </label>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Комментарий (необязательно)"
            className="w-full resize-none rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
            >
              Отмена
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
            >
              {busy ? 'Отправляем…' : 'Отправить'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

type PlaylistOption = {
  id: string
  name: string
  trackCount: number
  avatar: string | null
  cover: string | null
}

function AddToPlaylistDialog({
  open,
  onClose,
  track,
}: {
  open: boolean
  onClose: () => void
  track: PlayerTrack
}) {
  const [playlists, setPlaylists] = useState<PlaylistOption[] | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMessage(null)
    fetch('/api/playlists')
      .then((r) => r.json())
      .then((data: { playlists?: PlaylistOption[] }) => setPlaylists(data.playlists ?? []))
      .catch(() => setPlaylists([]))
  }, [open])

  async function addTo(playlistId: string) {
    setBusy(true)
    const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: track.id }),
    })
    setBusy(false)
    if (response.ok) {
      setMessage('Добавлено в плейлист')
      setTimeout(onClose, 700)
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      setMessage(data.error ?? 'Не удалось добавить')
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return
    setBusy(true)
    const created = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = (await created.json().catch(() => ({}))) as { id?: string; error?: string }
    if (created.ok && data.id) {
      await fetch(`/api/playlists/${data.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      })
      setNewName('')
      setMessage('Плейлист создан')
      setTimeout(onClose, 700)
    } else {
      setMessage(data.error ?? 'Не удалось создать плейлист')
    }
    setBusy(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить в плейлист"
      description={`«${track.title}» — ${track.artist}`}
    >
      <div className="mb-4 flex items-center gap-3 rounded-md bg-white/5 p-2">
        <TrackAvatar title={track.title} className="h-10 w-10" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{track.title}</div>
          <div className="truncate text-xs text-muted">{track.artist}</div>
        </div>
      </div>

      <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
        {playlists === null ? (
          <p className="px-2 py-3 text-sm text-muted">Загружаем плейлисты…</p>
        ) : playlists.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">У вас пока нет плейлистов.</p>
        ) : (
          playlists.map((playlist) => (
            <button
              key={playlist.id}
              disabled={busy}
              onClick={() => addTo(playlist.id)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-white/5 disabled:opacity-50"
            >
              <Avatar
                name={playlist.name}
                src={playlist.avatar ?? playlist.cover}
                shape="square"
                className="h-9 w-9"
                textClassName="text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate text-sm">{playlist.name}</span>
              <span className="text-xs text-dim">{playlist.trackCount}</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Новый плейлист"
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm placeholder:text-dim focus:border-white/40"
          />
          <button
            onClick={createAndAdd}
            disabled={!newName.trim() || busy}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
          >
            <CirclePlus size={15} /> Создать
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </div>
    </Modal>
  )
}

function EditTrackDialog({
  open,
  onClose,
  track,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  track: Track
  onSaved: () => void
}) {
  const [title, setTitle] = useState(track.title)
  const [artist, setArtist] = useState(track.artist)
  const [album, setAlbum] = useState(track.album ?? '')
  const [genre, setGenre] = useState(track.genre ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(track.title)
    setArtist(track.artist)
    setAlbum(track.album ?? '')
    setGenre(track.genre ?? '')
    setError(null)
  }, [open, track])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !title.trim() || !artist.trim()) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim() || null,
          genre: genre.trim() || null,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сохранить')
      onClose()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Изменить трек"
      description="Название, исполнитель и альбом обновятся в библиотеке и поиске."
    >
      <form onSubmit={submit} className="space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Название"
          className={inputClass}
        />
        <input
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          maxLength={80}
          placeholder="Исполнитель"
          className={inputClass}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={album}
            onChange={(event) => setAlbum(event.target.value)}
            maxLength={120}
            placeholder="Альбом"
            className={inputClass}
          />
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            maxLength={40}
            placeholder="Жанр"
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim() || !artist.trim()}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
