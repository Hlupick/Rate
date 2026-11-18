'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function send(payload: Record<string, string>, url: string) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Что-то пошло не так')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Сервер недоступен')
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (mode === 'login') {
      await send({ login, password }, '/api/auth/login')
    } else {
      await send({ displayName, username, email, password }, '/api/auth/register')
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-6 shadow-2xl md:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {mode === 'login' ? 'Вход в Rate' : 'Создать аккаунт'}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {mode === 'login'
          ? 'Слушайте музыку, которую добавляют люди.'
          : 'Минута — и вы сможете загружать треки и собирать плейлисты.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        {mode === 'register' && (
          <>
            <Field label="Как вас зовут">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Стас"
                maxLength={40}
                required
                className="input"
              />
            </Field>
            <Field label="Имя пользователя">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="stas"
                pattern="[a-z0-9_]{3,24}"
                title="3–24 символа: латиница, цифры, подчёркивание"
                required
                className="input"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@monah.local"
                required
                className="input"
              />
            </Field>
          </>
        )}

        {mode === 'login' && (
          <Field label="E-mail или имя пользователя">
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="demo@monah.local"
              required
              autoFocus
              className="input"
            />
          </Field>
        )}

        <Field label="Пароль">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
            className="input"
          />
        </Field>

        {error && (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>

      {mode === 'login' && (
        <button
          onClick={() => {
            setLogin('demo@monah.local')
            setPassword('monah123')
            send({ login: 'demo@monah.local', password: 'monah123' }, '/api/auth/login')
          }}
          disabled={busy}
          className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-50"
        >
          Войти в демо-аккаунт
        </button>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        {mode === 'login' ? (
          <>
            Нет аккаунта?{' '}
            <Link href="/register" className="font-medium text-ink underline underline-offset-2">
              Зарегистрироваться
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-medium text-ink underline underline-offset-2">
              Войти
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
