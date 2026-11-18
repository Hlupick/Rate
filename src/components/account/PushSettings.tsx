'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Prefs = { messages: boolean; social: boolean }

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

/** Web Push setup and category switches on the settings page. */
export function PushSettings() {
  const [supported, setSupported] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>({ messages: true, social: true })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(ok)

    fetch('/api/push/config')
      .then((response) => response.json())
      .then((data: { enabled?: boolean; publicKey?: string }) => {
        setConfigured(Boolean(data.enabled))
        setPublicKey(data.publicKey ?? '')
      })
      .catch(() => setConfigured(false))

    fetch('/api/push/prefs')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Prefs | null) => {
        if (data) setPrefs({ messages: data.messages, social: data.social })
      })
      .catch(() => undefined)

    if (!ok) return
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => undefined)
  }, [])

  async function enable() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!publicKey) throw new Error('Push не настроены на сервере')
      let permission = Notification.permission
      if (permission === 'default') permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Разрешение не выдано. Включите уведомления в настройках браузера.')
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }))

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось включить уведомления')
      setSubscribed(true)
      setNotice('Уведомления включены на этом устройстве.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось включить уведомления')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined)
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      setNotice('Уведомления отключены на этом устройстве.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отключить уведомления')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as { error?: string; sent?: number }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось отправить тест')
      setNotice(`Тестовое уведомление отправлено (${data.sent ?? 1}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить тест')
    } finally {
      setBusy(false)
    }
  }

  async function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setError('')
    try {
      const response = await fetch('/api/push/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      })
      if (!response.ok) throw new Error('Не удалось сохранить настройку')
    } catch (err) {
      setPrefs(prefs)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить настройку')
    }
  }

  return (
    <section id="notifications" className="rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-amber-300" />
        <h2 className="text-sm font-semibold">Уведомления</h2>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Push приходят, даже когда сайт закрыт: новые сообщения, подписки и взаимная дружба.
      </p>

      {!supported ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted">
          Этот браузер не поддерживает push-уведомления.
        </p>
      ) : !configured ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted">
          Push пока не настроены на сервере.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void (subscribed ? disable() : enable())}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60',
                subscribed
                  ? 'border border-white/15 bg-black/30 text-muted hover:text-ink'
                  : 'bg-accent text-black hover:bg-white',
              )}
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : subscribed ? (
                <BellOff size={13} />
              ) : (
                <Bell size={13} />
              )}
              {subscribed ? 'Отключить на этом устройстве' : 'Включить push'}
            </button>
            {subscribed && (
              <button
                type="button"
                onClick={() => void test()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-muted transition hover:border-white/25 hover:text-ink disabled:opacity-60"
              >
                <Send size={12} />
                Проверить
              </button>
            )}
            <span
              className={cn(
                'text-[11px] font-medium',
                subscribed ? 'text-emerald-300' : 'text-dim',
              )}
            >
              {subscribed ? 'Включены на этом устройстве' : 'Выключены'}
            </span>
          </div>

          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {(
              [
                ['messages', 'Сообщения', 'Личные сообщения от друзей'],
                ['social', 'Подписки и друзья', 'Новые подписчики и взаимная дружба'],
              ] as const
            ).map(([key, title, hint]) => (
              <button
                key={key}
                type="button"
                onClick={() => void togglePref(key)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
              >
                <span>
                  <span className="block text-xs font-medium text-ink">{title}</span>
                  <span className="block text-[10.5px] text-dim">{hint}</span>
                </span>
                <span
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full transition',
                    prefs[key] ? 'bg-accent' : 'bg-white/15',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                      prefs[key] ? 'left-[18px]' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-[10.5px] leading-snug text-dim">
            На iPhone push работают после установки Rate на экран «Домой». Отключение уведомлений в
            конкретном чате по-прежнему действует.
          </p>
        </>
      )}

      {notice && <p className="mt-3 text-[11px] text-emerald-300">{notice}</p>}
      {error && <p className="mt-2 text-[11px] text-amber-300">{error}</p>}
    </section>
  )
}
