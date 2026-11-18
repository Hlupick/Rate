'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, LogOut, Settings, Shield, Upload, User } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { StreakPill } from '@/components/streak/StreakPill'

type TopBarProps = {
  user: {
    displayName: string
    username: string
    avatar?: string | null
    avatarFrame?: string | null
    isAdmin?: boolean
  } | null
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-panel/85 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="md:hidden">
          <Logo size={22} />
        </Link>
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={() => router.back()}
            aria-label="Назад"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-muted transition hover:text-ink"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => router.forward()}
            aria-label="Вперёд"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-muted transition hover:text-ink"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <StreakPill className="md:hidden" />
              <Link
                href="/upload"
                className="hidden items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink sm:flex"
              >
                <Upload size={15} />
                Загрузить
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-10 items-center gap-2 rounded-full bg-black/50 p-1 pr-3 text-sm transition hover:bg-black/70"
                  aria-label="Меню профиля"
                >
                  <Avatar
                    name={user.displayName}
                    src={user.avatar}
                    frame={user.avatarFrame}
                    className="h-8 w-8"
                    textClassName="text-[10px]"
                  />
                  <span className="hidden max-w-32 truncate font-medium sm:block">
                    {user.displayName}
                  </span>
                </button>
                {menuOpen && (
                  <div className="animate-pop absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-[#1b1b1b] p-1 shadow-2xl">
                    <div className="px-3 py-2.5">
                      <div className="truncate text-sm font-semibold">{user.displayName}</div>
                      <div className="truncate text-xs text-muted">@{user.username}</div>
                    </div>
                    <div className="my-1 h-px bg-white/5" />
                    <Link
                      href={`/profile/${user.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
                    >
                      <User size={15} /> Профиль
                    </Link>
                    <Link
                      href="/library?tab=uploads"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
                    >
                      <Upload size={15} /> Мои загрузки
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
                    >
                      <Settings size={15} /> Настройки
                    </Link>
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
                      >
                        <Shield size={15} /> Админка
                      </Link>
                    )}
                    <div className="my-1 h-px bg-white/5" />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted transition hover:bg-white/5 hover:text-ink"
                    >
                      <LogOut size={15} /> Выйти
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-white"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
