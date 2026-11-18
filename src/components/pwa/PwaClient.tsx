'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaClient() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (window.localStorage.getItem('monah-install-hidden') === '1') setHidden(true)

    const onInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onInstall)

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone && /iPad|iPhone|iPod/i.test(window.navigator.userAgent)) {
      setShowIosHint(true)
    }

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      }
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }

    return () => window.removeEventListener('beforeinstallprompt', onInstall)
  }, [])

  function dismiss() {
    setHidden(true)
    setInstallEvent(null)
    setShowIosHint(false)
    window.localStorage.setItem('monah-install-hidden', '1')
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice.catch(() => undefined)
    dismiss()
  }

  if (hidden || (!installEvent && !showIosHint)) return null

  return (
    <div className="fixed inset-x-3 bottom-[140px] z-40 mx-auto max-w-sm rounded-xl border border-line bg-panel-2 p-3 shadow-xl md:inset-x-auto md:right-5 md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card">
          <Download size={17} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">Установить monah</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {showIosHint
              ? 'Нажмите «Поделиться» → «На домашний экран», чтобы открывать monah как приложение.'
              : 'Открывайте monah с домашнего экрана: быстрее запуск и удобное управление музыкой.'}
          </p>
          <div className="mt-2 flex gap-2">
            {installEvent && (
              <button
                onClick={() => void install()}
                className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white"
              >
                Установить
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:text-ink"
            >
              Позже
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Скрыть подсказку"
          className="rounded p-1 text-dim transition hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
