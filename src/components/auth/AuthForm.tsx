'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { checkUsernameFormat } from '@/lib/username'

export function AuthForm({
  mode,
  canResetPassword = true,
}: {
  mode: 'login' | 'register'
  canResetPassword?: boolean
}) {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Registration happens in two steps: details, then the code from the letter.
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [usernameState, setUsernameState] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'error'
    message: string
  }>({ status: 'idle', message: '' })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Check the nickname while the person types: format first, availability next.
  useEffect(() => {
    if (mode !== 'register' || step !== 'details') return
    const value = username.trim()
    if (!value) {
      setUsernameState({ status: 'idle', message: '' })
      return
    }
    const format = checkUsernameFormat(value)
    if (!format.ok) {
      setUsernameState({ status: 'error', message: format.error })
      return
    }

    setUsernameState({ status: 'checking', message: 'Проверяем…' })
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/auth/username?u=${encodeURIComponent(format.username)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as {
            available?: boolean
            error?: string
          }
          if (data.available) {
            setUsernameState({ status: 'ok', message: 'Ник свободен' })
          } else {
            setUsernameState({
              status: 'error',
              message: data.error ?? 'Этот ник уже занят',
            })
          }
        })
        .catch((err: unknown) => {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            setUsernameState({ status: 'idle', message: '' })
          }
        })
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [username, mode, step])

  async function post(url: string, payload: Record<string, string>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => ({}))) as {
      error?: string
      pending?: boolean
      resendAfter?: number
    }
    if (!response.ok) throw new Error(data.error ?? 'Что-то пошло не так')
    return data
  }

  function finish() {
    router.push('/')
    router.refresh()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        await post('/api/auth/login', { login, password })
        finish()
        return
      }
      if (step === 'details') {
        const data = await post('/api/auth/register', {
          displayName,
          username,
          email,
          password,
        })
        if (data.pending) {
          setStep('code')
          setCode('')
          setCooldown(data.resendAfter ?? 60)
        } else {
          finish()
        }
        return
      }
      await post('/api/auth/verify', { email, code })
      finish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сервер недоступен')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return
    setBusy(true)
    setError(null)
    try {
      const data = await post('/api/auth/verify/resend', { email })
      setCooldown(data.resendAfter ?? 60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код')
    } finally {
      setBusy(false)
    }
  }

  const showCode = mode === 'register' && step === 'code'

  return (
    <div className="rounded-xl border border-line bg-panel p-6 shadow-2xl md:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {mode === 'login' ? 'Вход в Rate' : showCode ? 'Подтвердите почту' : 'Создать аккаунт'}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {mode === 'login'
          ? 'Слушайте музыку, которую добавляют люди.'
          : showCode
            ? `Код отправлен на ${email}. Он действует 10 минут.`
            : 'Минута — и вы сможете загружать треки и собирать плейлисты.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        {mode === 'register' && step === 'details' && (
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
                placeholder="stanislav"
                pattern="[a-z0-9]{5,14}"
                title="5–14 символов: латинские буквы и цифры"
                autoComplete="username"
                required
                className="input"
              />
              <span
                className={`mt-1.5 block text-[11px] leading-relaxed ${
                  usernameState.status === 'ok'
                    ? 'text-emerald-300'
                    : usernameState.status === 'error'
                      ? 'text-red-300'
                      : 'text-muted'
                }`}
              >
                {usernameState.status === 'idle'
                  ? '5–14 символов: латинские буквы и цифры. Ник останется с вами навсегда.'
                  : usernameState.message}
              </span>
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </Field>
          </>
        )}

        {showCode && (
          <Field label="Код из письма">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="input text-center text-xl font-bold tracking-[0.4em]"
            />
          </Field>
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

        {!showCode && (
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
        )}

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
          {mode === 'login' ? 'Войти' : showCode ? 'Подтвердить' : 'Зарегистрироваться'}
        </button>
      </form>

      {showCode && (
        <div className="mt-3 space-y-2 text-center text-sm">
          <button
            onClick={() => void resend()}
            disabled={busy || cooldown > 0}
            className="text-muted transition hover:text-ink disabled:opacity-50"
          >
            {cooldown > 0 ? `Отправить снова через ${cooldown} с` : 'Отправить код снова'}
          </button>
          <p className="text-xs text-muted">
            Письма нет? Проверьте папку «Спам».{' '}
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setError(null)
              }}
              className="underline underline-offset-2 hover:text-ink"
            >
              Изменить данные
            </button>
          </p>
        </div>
      )}

      {mode === 'login' && canResetPassword && (
        <Link
          href="/forgot"
          className="mt-3 block text-center text-sm text-muted transition hover:text-ink"
        >
          Забыли пароль?
        </Link>
      )}

      {mode === 'login' && (
        <button
          onClick={() => {
            setLogin('demo@monah.local')
            setPassword('monah123')
            setBusy(true)
            setError(null)
            post('/api/auth/login', { login: 'demo@monah.local', password: 'monah123' })
              .then(finish)
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : 'Сервер недоступен'),
              )
              .finally(() => setBusy(false))
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
