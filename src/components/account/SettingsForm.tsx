'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react'

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted">{icon}</div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const inputClass =
  'w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-dim focus:border-white/40'
const primaryClass =
  'flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40'
const secondaryClass =
  'flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-40'

export function SettingsForm({ username }: { username: string }) {
  const router = useRouter()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState('')

  const [sessionsBusy, setSessionsBusy] = useState(false)
  const [sessionsDone, setSessionsDone] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (pwBusy) return
    setPwError('')
    setPwDone('')
    if (next !== repeat) {
      setPwError('Новые пароли не совпадают')
      return
    }
    setPwBusy(true)
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сменить пароль')
      setCurrent('')
      setNext('')
      setRepeat('')
      setPwDone('Пароль обновлён. Остальные устройства вышли из аккаунта.')
    } catch (error) {
      setPwError(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setPwBusy(false)
    }
  }

  async function signOutEverywhere() {
    if (sessionsBusy) return
    setSessionsBusy(true)
    setSessionsDone('')
    try {
      const response = await fetch('/api/account/sessions', { method: 'POST' })
      if (!response.ok) throw new Error('Не удалось завершить сессии')
      setSessionsDone('Все другие устройства вышли из аккаунта.')
    } catch {
      setSessionsDone('Не удалось завершить сессии, попробуйте ещё раз.')
    } finally {
      setSessionsBusy(false)
    }
  }

  async function deleteAccount() {
    if (deleteBusy) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось удалить аккаунт')
      router.push('/')
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Section
        icon={<KeyRound size={18} />}
        title="Пароль"
        description="После смены пароля все остальные устройства выйдут из аккаунта."
      >
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            placeholder="Текущий пароль"
            autoComplete="current-password"
            className={inputClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              placeholder="Новый пароль (от 8 символов)"
              autoComplete="new-password"
              className={inputClass}
            />
            <input
              type="password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          {pwError && <p className="text-sm text-red-400">{pwError}</p>}
          {pwDone && <p className="text-sm text-muted">{pwDone}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwBusy || !current || next.length < 8 || !repeat}
              className={primaryClass}
            >
              {pwBusy && <Loader2 size={15} className="animate-spin" />}
              {pwBusy ? 'Сохраняем…' : 'Сменить пароль'}
            </button>
          </div>
        </form>
      </Section>

      <Section
        icon={<LogOut size={18} />}
        title="Сессии"
        description="Если вы входили в аккаунт на чужом устройстве, завершите все сессии кроме текущей."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {sessionsDone || `Вы вошли как @${username}.`}
          </p>
          <button
            type="button"
            onClick={signOutEverywhere}
            disabled={sessionsBusy}
            className={secondaryClass}
          >
            {sessionsBusy && <Loader2 size={15} className="animate-spin" />}
            Выйти на всех устройствах
          </button>
        </div>
      </Section>

      <Section
        icon={<ShieldCheck size={18} />}
        title="Данные"
        description="Профиль, плейлисты и загруженные треки удаляются вместе с аккаунтом."
      >
        {!deleteOpen ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Это действие нельзя отменить.</p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400/60 hover:text-red-200"
            >
              <AlertTriangle size={15} /> Удалить аккаунт
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Будут удалены профиль, плейлисты и все ваши загрузки. Восстановить их нельзя.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="Введите пароль для подтверждения"
              autoComplete="current-password"
              className={inputClass}
            />
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false)
                  setDeletePassword('')
                  setDeleteError('')
                }}
                className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleteBusy || !deletePassword}
                className="flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {deleteBusy && <Loader2 size={15} className="animate-spin" />}
                Удалить навсегда
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
