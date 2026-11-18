'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, BellOff, Loader2, MessageCircle, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/format'
import { CHAT_MESSAGE_MAX } from '@/lib/chat-config'
import type { ChatMessage, ChatOther, ChatSummary } from '@/lib/chat'
import { cn } from '@/lib/utils'
import { ChatSettings } from './ChatSettings'

const clock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current
  const known = new Set(current.map((message) => message.id))
  const fresh = incoming.filter((message) => !known.has(message.id))
  return fresh.length > 0 ? [...current, ...fresh] : current
}

export function ChatApp({ viewer }: { viewer: { username: string; displayName: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get('with')
  const [selected, setSelected] = useState<string | null>(initial)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [other, setOther] = useState<ChatOther | null>(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const [muted, setMuted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const lastIdRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const typingSentRef = useRef(0)

  useEffect(() => {
    lastIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : 0
  }, [messages])

  useEffect(() => {
    const element = listRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, threadLoading])

  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats')
      if (!response.ok) return
      const data = (await response.json()) as { chats?: ChatSummary[]; unread?: number }
      setChats(data.chats ?? [])
      setUnread(Number(data.unread ?? 0))
    } catch {
      /* keep the last known list */
    } finally {
      setChatsLoading(false)
    }
  }, [])

  const markRead = useCallback(async (username: string) => {
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(username)}/read`, {
        method: 'POST',
      })
      if (!response.ok) return
      const data = (await response.json()) as { unread?: number }
      setUnread(Number(data.unread ?? 0))
      setChats((current) =>
        current.map((chat) => (chat.username === username ? { ...chat, unread: 0 } : chat)),
      )
      window.dispatchEvent(new Event('monah:chats'))
    } catch {
      /* no-op */
    }
  }, [])

  useEffect(() => {
    void loadChats()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void loadChats()
    }, 10_000)
    const handler = () => void loadChats()
    window.addEventListener('monah:chats', handler)
    return () => {
      clearInterval(timer)
      window.removeEventListener('monah:chats', handler)
    }
  }, [loadChats])

  const loadThread = useCallback(
    async (username: string) => {
      setThreadLoading(true)
      setThreadError('')
      setOther(null)
      setOtherTyping(false)
      setMuted(false)
      setMessages([])
      setHasMore(false)
      try {
        const response = await fetch(`/api/chats/${encodeURIComponent(username)}`)
        const data = (await response.json().catch(() => ({}))) as {
          other?: ChatOther
          messages?: ChatMessage[]
          hasMore?: boolean
          otherTyping?: boolean
          muted?: boolean
          unread?: number
          error?: string
        }
        if (!response.ok || !data.other) {
          throw new Error(data.error ?? 'Не удалось открыть переписку')
        }
        setOther(data.other)
        setOtherTyping(Boolean(data.otherTyping))
        setMuted(Boolean(data.muted))
        setMessages(data.messages ?? [])
        setHasMore(Boolean(data.hasMore))
        setUnread(Number(data.unread ?? 0))
        if ((data.messages ?? []).length > 0) void markRead(username)
        if (document.visibilityState === 'visible') {
          window.dispatchEvent(new Event('monah:chats'))
        }
      } catch (err) {
        setThreadError(err instanceof Error ? err.message : 'Не удалось открыть переписку')
      } finally {
        setThreadLoading(false)
      }
    },
    [markRead],
  )

  useEffect(() => {
    if (!selected) {
      setOther(null)
      setOtherTyping(false)
      setMuted(false)
      setMessages([])
      setThreadError('')
      return
    }
    typingSentRef.current = 0
    void loadThread(selected)
  }, [selected, loadThread])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const after = lastIdRef.current
        const response = await fetch(
          `/api/chats/${encodeURIComponent(selected)}${after > 0 ? `?after=${after}` : ''}`,
        )
        if (!response.ok) {
          if (response.status === 403) setThreadError('Переписка доступна только друзьям')
          return
        }
        const data = (await response.json()) as {
          other?: ChatOther
          messages?: ChatMessage[]
          otherTyping?: boolean
          muted?: boolean
          unread?: number
        }
        if (cancelled) return
        if (data.other) setOther(data.other)
        setOtherTyping(Boolean(data.otherTyping))
        setMuted(Boolean(data.muted))
        if (data.messages && data.messages.length > 0) {
          setMessages((current) => mergeMessages(current, data.messages!))
          setUnread(Number(data.unread ?? 0))
          if (data.messages.some((message) => !message.mine)) void markRead(selected)
          void loadChats()
        }
      } catch {
        /* keep polling quietly */
      }
    }, 3500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [selected, markRead, loadChats])

  function selectChat(username: string) {
    setSelected(username)
    setInput('')
    const params = new URLSearchParams(searchParams.toString())
    params.set('with', username)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function backToList() {
    setSelected(null)
    router.replace(pathname, { scroll: false })
  }

  async function toggleMute() {
    if (!selected) return
    const next = !muted
    setMuted(next)
    setChats((current) =>
      current.map((chat) => (chat.username === selected ? { ...chat, muted: next } : chat)),
    )
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(selected)}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: next }),
      })
      if (!response.ok) throw new Error('Не удалось изменить настройку')
    } catch {
      setMuted(!next)
      setChats((current) =>
        current.map((chat) => (chat.username === selected ? { ...chat, muted: !next } : chat)),
      )
    }
  }

  function handleInput(value: string) {
    setInput(value)
    if (!selected || !value.trim()) return
    const now = Date.now()
    if (now - typingSentRef.current < 2500) return
    typingSentRef.current = now
    fetch(`/api/chats/${encodeURIComponent(selected)}/typing`, { method: 'POST' }).catch(() => undefined)
  }

  async function send() {
    const text = input.trim()
    if (!text || !selected || sending) return
    setSending(true)
    setThreadError('')
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage
        unread?: number
        error?: string
      }
      if (!response.ok || !data.message) {
        throw new Error(data.error ?? 'Не удалось отправить сообщение')
      }
      setInput('')
      setMessages((current) => mergeMessages(current, [data.message!]))
      typingSentRef.current = 0
      void markRead(selected)
      void loadChats()
      window.dispatchEvent(new Event('monah:chats'))
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  async function loadOlder() {
    if (!selected || messages.length === 0) return
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(selected)}?before=${messages[0].id}`,
      )
      if (!response.ok) return
      const data = (await response.json()) as { messages?: ChatMessage[]; hasMore?: boolean }
      setMessages((current) => [...(data.messages ?? []), ...current])
      setHasMore(Boolean(data.hasMore))
    } catch {
      /* no-op */
    }
  }

  const totalUnread = unread

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[420px] overflow-hidden rounded-lg border border-line bg-panel md:h-[calc(100dvh-9rem)]">
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-line md:flex md:w-[310px]',
          selected ? 'hidden' : 'flex',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Сообщения</h1>
          <div className="flex items-center gap-1.5">
            {totalUnread > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-black">
                {totalUnread}
              </span>
            )}
            <ChatSettings />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {chatsLoading ? (
            <p className="px-2 py-6 text-center text-sm text-muted">Загружаем…</p>
          ) : chats.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageCircle size={28} className="mx-auto text-dim" />
              <p className="mt-3 text-sm font-medium text-ink">Пока нет переписок</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Подпишитесь друг на друга — и здесь появится чат.
              </p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.chatId}
                type="button"
                onClick={() => selectChat(chat.username)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-white/5',
                  selected === chat.username && 'bg-white/10',
                )}
              >
                <span className="relative shrink-0">
                  <Avatar
                    name={chat.displayName}
                    src={chat.avatar}
                    frame={chat.avatarFrame}
                    className="h-11 w-11"
                    textClassName="text-xs"
                  />
                  {chat.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-panel" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink">
                        {chat.displayName}
                      </span>
                      {chat.muted && <BellOff size={10} className="shrink-0 text-dim" />}
                    </span>
                    <span className="shrink-0 text-[10px] text-dim">
                      {timeAgo(chat.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-[11px]',
                        chat.typing ? 'text-emerald-300' : 'text-muted',
                      )}
                    >
                      {chat.typing
                        ? 'печатает…'
                        : chat.lastMessage
                          ? `${chat.lastMessageMine ? 'Вы: ' : ''}${chat.lastMessage.replace(/\s+/g, ' ')}`
                          : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
                        {chat.unread > 99 ? '99+' : chat.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section
        className={cn(
          'min-w-0 flex-1 flex-col bg-base/20 md:flex',
          selected ? 'flex' : 'hidden',
        )}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <button
            type="button"
            onClick={backToList}
            aria-label="Назад к перепискам"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-ink md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
          {other ? (
            <Link
              href={`/profile/${other.username}`}
              className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-0.5 transition hover:bg-white/5"
            >
              <Avatar
                name={other.displayName}
                src={other.avatar}
                frame={other.avatarFrame}
                className="h-9 w-9"
                textClassName="text-[10px]"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {other.displayName}
                </span>
                <span
                  className={cn(
                    'block truncate text-[11px]',
                    otherTyping || other.online ? 'text-emerald-300' : 'text-muted',
                  )}
                >
                  {otherTyping
                    ? 'печатает…'
                    : other.online
                      ? 'В сети'
                      : other.lastSeenAt > 0
                        ? `Последний визит ${timeAgo(other.lastSeenAt)}`
                        : 'Не в сети'}
                </span>
              </span>
            </Link>
          ) : (
            <span className="text-sm font-semibold text-muted">Переписка</span>
          )}
          {other && messages.length > 0 && (
            <button
              type="button"
              onClick={() => void toggleMute()}
              aria-label={muted ? 'Включить уведомления чата' : 'Отключить уведомления чата'}
              title={muted ? 'Уведомления выключены' : 'Уведомления включены'}
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-ink"
            >
              {muted ? <BellOff size={15} /> : <Bell size={15} />}
            </button>
          )}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {threadLoading && messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Загружаем сообщения…</p>
          ) : threadError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-300">{threadError}</p>
              <button
                type="button"
                onClick={backToList}
                className="mt-3 rounded-full border border-line px-4 py-1.5 text-xs text-muted transition hover:text-ink"
              >
                К перепискам
              </button>
            </div>
          ) : !other ? (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-xs text-center text-sm text-muted">
                Выберите переписку слева или откройте чат из профиля друга.
              </p>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="mb-3 text-center">
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted transition hover:text-ink"
                  >
                    Показать более ранние
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">
                  Начните переписку — напишите первое сообщение.
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed sm:max-w-[70%]',
                          message.mine
                            ? 'rounded-br-md bg-accent text-black'
                            : 'rounded-bl-md bg-white/10 text-ink',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <span
                          className={cn(
                            'mt-1 block text-right text-[9px] tabular-nums',
                            message.mine ? 'text-black/50' : 'text-dim',
                          )}
                        >
                          {clock.format(new Date(message.createdAt))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {other && !threadError && (
          <div className="border-t border-line p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => handleInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                maxLength={CHAT_MESSAGE_MAX}
                rows={1}
                placeholder={`Сообщение для ${other.displayName}…`}
                className="input max-h-32 min-h-10 flex-1 resize-none py-2.5"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                aria-label="Отправить сообщение"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black transition hover:bg-white disabled:opacity-40"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
