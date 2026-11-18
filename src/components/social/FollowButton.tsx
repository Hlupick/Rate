'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, UserPlus } from 'lucide-react'
import type { FollowRelation } from '@/lib/social'
import { cn } from '@/lib/utils'

const LABELS: Record<FollowRelation, string> = {
  self: 'Это вы',
  none: 'Подписаться',
  following: 'Вы подписаны',
  'followed-by': 'Подписаться в ответ',
  friends: 'Вы друзья',
}

export function FollowButton({
  username,
  initialRelation,
  isAuthenticated,
}: {
  username: string
  initialRelation: FollowRelation
  isAuthenticated: boolean
}) {
  const router = useRouter()
  const [relation, setRelation] = useState<FollowRelation>(initialRelation)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (relation === 'self') return null

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white"
      >
        <UserPlus size={13} /> Подписаться
      </Link>
    )
  }

  const isFriend = relation === 'friends'
  const isFollowing = relation === 'following' || isFriend
  const nextFollow = !isFollowing

  async function toggle() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/follows/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: nextFollow }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        relation?: FollowRelation
        error?: string
      }
      if (!response.ok || !data.relation) {
        throw new Error(data.error ?? 'Не удалось изменить подписку')
      }
      setRelation(data.relation)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить подписку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        title={isFollowing ? 'Отписаться' : undefined}
        className={cn(
          'group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60',
          isFriend
            ? 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100 hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-200'
            : isFollowing
              ? 'border-white/15 bg-black/40 text-muted hover:border-white/30 hover:text-ink'
              : 'border-transparent bg-accent text-black hover:bg-white',
        )}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isFollowing ? (
          <Check size={13} />
        ) : (
          <UserPlus size={13} />
        )}
        {isFriend ? (
          <>
            <span className="group-hover:hidden">Вы друзья</span>
            <span className="hidden group-hover:inline">Отписаться</span>
          </>
        ) : (
          LABELS[relation]
        )}
      </button>
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </span>
  )
}
