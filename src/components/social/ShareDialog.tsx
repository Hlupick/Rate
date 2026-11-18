'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import type { ChatSummary } from '@/lib/chat'
import { cn } from '@/lib/utils'

/** Pick a friend and send a track/playlist card into the chat. */
export function ShareDialog({
  open,
  onClose,
  type,
  id,
  title,
}: {
  open: boolean
  onClose: () => void
  type: 'track' | 'playlist'
  id: string
  title: string
}) {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSent(false)
    setError('')
    setText('')
    setSelected(null)
    setLoading(true)
    let cancelled = false
    fetch('/api/chats')
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { chats?: ChatSummary[] }
        if (!response.ok) throw new Error('Не удалось загрузить друзей')
        if (!cancelled) setChats(data.chats ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить друзей')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function send() {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text.trim(), attachment: { type, id } }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось отправить')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={type === 'track' ? 'Поделиться треком' : 'Поделиться плейлистом'}
      description={title}
    >
      {sent ? (
        <div className="py-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check size={22} />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">Отправлено</p>
          <p className="mt-1 text-xs text-muted">Карточка уже в переписке.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href={`/chats?with=${encodeURIComponent(selected ?? '')}`}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-white"
            >
              Открыть чат
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:text-ink"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Загружаем друзей…</p>
          ) : chats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Пока нет друзей. Подпишитесь друг на друга, чтобы отправлять музыку.
            </p>
          ) : (
            <>
              <p className="text-[11px] text-muted">Кому отправить</p>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {chats.map((chat) => (
                  <button
                    key={chat.chatId}
                    type="button"
                    onClick={() => setSelected(chat.username)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition',
                      selected === chat.username ? 'bg-white/10' : 'hover:bg-white/5',
                    )}
                  >
                    <Avatar
                      name={chat.displayName}
                      src={chat.avatar}
                      frame={chat.avatarFrame}
                      className="h-9 w-9"
                      textClassName="text-[10px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {chat.displayName}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        @{chat.username}
                      </span>
                    </span>
                    {selected === chat.username && <Check size={15} className="text-emerald-300" />}
                  </button>
                ))}
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Добавить сообщение (необязательно)"
                className="input resize-none"
              />

              {error && <p className="text-xs text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void send()}
                disabled={!selected || busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                Отправить
              </button>
            </>
          )}

          {!loading && chats.length === 0 && error && (
            <p className="text-center text-xs text-red-300">{error}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
