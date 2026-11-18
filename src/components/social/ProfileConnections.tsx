'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { plural } from '@/lib/format'
import type { ConnectionTab, ConnectionUser, FollowStats } from '@/lib/social'
import { cn } from '@/lib/utils'

const TABS: { key: ConnectionTab; label: string }[] = [
  { key: 'friends', label: 'Друзья' },
  { key: 'followers', label: 'Подписчики' },
  { key: 'following', label: 'Подписки' },
]

function relationLabel(relation: ConnectionUser['relation']): string | null {
  if (relation === 'friends') return 'вы друзья'
  if (relation === 'following') return 'вы подписаны'
  if (relation === 'followed-by') return 'подписан на вас'
  if (relation === 'self') return 'это вы'
  return null
}

/** Clickable follower/following/friends counters with a shared dialog. */
export function ProfileConnections({
  username,
  stats,
}: {
  username: string
  stats: FollowStats
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ConnectionTab>('friends')
  const [items, setItems] = useState<ConnectionUser[]>([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function show(nextTab: ConnectionTab) {
    setTab(nextTab)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setItems([])
    setNextOffset(null)

    fetch(`/api/users/${encodeURIComponent(username)}/connections?tab=${tab}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          items?: ConnectionUser[]
          total?: number
          nextOffset?: number | null
          error?: string
        }
        if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить список')
        setItems(data.items ?? [])
        setTotal(Number(data.total ?? 0))
        setNextOffset(data.nextOffset ?? null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [open, tab, username])

  async function loadMore() {
    if (nextOffset === null || loading) return
    setLoading(true)
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/connections?tab=${tab}&offset=${nextOffset}`,
      )
      const data = (await response.json().catch(() => ({}))) as {
        items?: ConnectionUser[]
        total?: number
        nextOffset?: number | null
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить список')
      setItems((current) => [...current, ...(data.items ?? [])])
      setTotal(Number(data.total ?? 0))
      setNextOffset(data.nextOffset ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список')
    } finally {
      setLoading(false)
    }
  }

  const counts: Record<ConnectionTab, number> = {
    friends: stats.friends,
    followers: stats.followers,
    following: stats.following,
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted md:justify-start">
        <button type="button" onClick={() => show('followers')} className="transition hover:text-ink">
          <span className="font-semibold text-ink">{stats.followers}</span>{' '}
          {plural(stats.followers, 'подписчик', 'подписчика', 'подписчиков')}
        </button>
        <span className="text-dim">·</span>
        <button type="button" onClick={() => show('following')} className="transition hover:text-ink">
          <span className="font-semibold text-ink">{stats.following}</span>{' '}
          {plural(stats.following, 'подписка', 'подписки', 'подписок')}
        </button>
        <span className="text-dim">·</span>
        <button type="button" onClick={() => show('friends')} className="transition hover:text-ink">
          <span className="font-semibold text-ink">{stats.friends}</span>{' '}
          {plural(stats.friends, 'друг', 'друга', 'друзей')}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Друзья и подписки">
        <div className="flex gap-1 rounded-full bg-black/40 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                tab === item.key ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {item.label}
              <span className="ml-1 text-[10px] text-dim">{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 max-h-[52vh] min-h-28 overflow-y-auto pr-1">
          {loading && items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">Загружаем…</p>
          ) : error ? (
            <p className="px-2 py-6 text-center text-sm text-red-300">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              {tab === 'friends'
                ? 'Друзей пока нет: подписки должны быть взаимными.'
                : tab === 'followers'
                  ? 'Подписчиков пока нет.'
                  : 'Ни на кого пока не подписаны.'}
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((person) => {
                const mark = relationLabel(person.relation)
                return (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/5"
                  >
                    <Link
                      href={`/profile/${person.username}`}
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Avatar
                        name={person.displayName}
                        src={person.avatar}
                        frame={person.avatarFrame}
                        className="h-10 w-10"
                        textClassName="text-xs"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {person.displayName}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          @{person.username}
                          {mark && <span className="ml-2 text-[10px] text-dim">{mark}</span>}
                        </span>
                      </span>
                    </Link>
                    {person.relation === 'friends' && (
                      <Link
                        href={`/chats?with=${encodeURIComponent(person.username)}`}
                        onClick={() => setOpen(false)}
                        title={`Написать ${person.displayName}`}
                        aria-label={`Написать ${person.displayName}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-muted transition hover:border-white/25 hover:text-ink"
                      >
                        <MessageCircle size={14} />
                      </Link>
                    )}
                  </div>
                )
              })}
              {nextOffset !== null && (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loading}
                  className="mt-2 w-full rounded-full border border-line px-4 py-2 text-xs font-medium text-muted transition hover:border-white/25 hover:text-ink disabled:opacity-50"
                >
                  {loading ? 'Загружаем…' : `Показать ещё (${total - items.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
