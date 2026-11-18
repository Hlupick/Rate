'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export function ForgotForm() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function post(url: string, payload: Record<string, string>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => ({}))) as {
      error?: string
      message?: string
    }
    if (!response.ok) throw new Error(data.error ?? 'Что-то пошло не так')
    return data
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const data = await post('/api/auth/password/request', { email })
      setNotice(data.message ?? 'Если такой адрес есть, код отправлен.')
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сервер недоступен')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password !== repeat) {
      setError('Пароли не совпадают')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await post('/api/auth/password/reset', { email, code, password })
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сервер недоступен')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-6 shadow-2xl md:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Восстановление пароля</h1>
      <p className="mt-1.5 text-sm text-muted">
        {step === 'email'
          ? 'Укажите почту, на которую зарегистрирован аккаунт.'
          : notice}
      </p>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="mt-6 space-y-3.5">
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="input"
            />
          </Field>

          {error && <ErrorBox text={error} />}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Отправить код
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 space-y-3.5">
          <Field label="Код из письма">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              className="input text-center text-xl font-bold tracking-[0.4em]"
            />
          </Field>
          <Field label="Новый пароль">
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
          <Field label="Повторите пароль">
            <input
              type="password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              className="input"
            />
          </Field>

          {error && <ErrorBox text={error} />}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Задать новый пароль
          </button>

          <p className="text-center text-xs text-muted">
            Письма нет? Проверьте «Спам» или{' '}
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
                setCode('')
              }}
              className="underline underline-offset-2 hover:text-ink"
            >
              запросите новый код
            </button>
          </p>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          Вернуться ко входу
        </Link>
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

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {text}
    </div>
  )
}
