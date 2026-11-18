'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'

export function InviteGate({ username }: { username: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось активировать код')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel-2 p-6 md:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card">
        <KeyRound size={20} className="text-ink" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">Загрузка по инвайту</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Привет, {username}. Слушать музыку можно без ограничений, а загружать — по коду приглашения.
        Это защищает сервер от случайных и нелегальных загрузок. Код можно получить у администратора
        или у друга, который уже загружает музыку.
      </p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Например, K7M2QX9P"
          maxLength={16}
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-3 py-2.5 font-mono text-sm uppercase tracking-[0.15em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal focus:border-white/40"
        />
        <button
          type="submit"
          disabled={!code.trim() || busy}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Активировать
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-6 border-t border-white/5 pt-4 text-xs leading-relaxed text-dim">
        Код одноразовый (или на несколько человек) и может иметь срок действия. Если кода нет —
        напишите администратору сайта.
      </div>
    </div>
  )
}
