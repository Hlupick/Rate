'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, Library, ListPlus, Plus, Search, Upload } from 'lucide-react'
import { Cover } from '@/components/ui/Cover'
import { Logo } from '@/components/ui/Logo'
import { CreatePlaylistDialog } from '@/components/playlist/CreatePlaylistDialog'
import { cn } from '@/lib/utils'
import { tracksWord } from '@/lib/format'

type SidebarPlaylist = {
  id: string
  name: string
  trackCount: number
  cover: string | null
}

type SidebarProps = {
  user: { displayName: string; username: string } | null
  playlists: SidebarPlaylist[]
}

const NAV = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/search', label: 'Поиск', icon: Search },
]

export function Sidebar({ user, playlists }: SidebarProps) {
  const pathname = usePathname()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <aside className="hidden w-[292px] shrink-0 flex-col gap-2 md:flex">
      <div className="rounded-lg bg-panel px-2 py-3">
        <Link href="/" className="mb-3 flex px-2 py-1">
          <Logo />
        </Link>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition',
                  active ? 'bg-card text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <item.icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-panel">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <Link
            href="/library"
            className={cn(
              'flex items-center gap-3 rounded-md px-1 py-1.5 text-[14px] font-medium transition',
              pathname === '/library' ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <Library size={20} strokeWidth={1.8} />
            Моя медиатека
          </Link>
          {user && (
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
              aria-label="Создать плейлист"
              title="Создать плейлист"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {user ? (
            <>
              <Link
                href="/library?tab=likes"
                className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#3a3a3a] to-[#1f1f1f]">
                  <Heart size={18} className="text-ink" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Мне нравится</div>
                  <div className="truncate text-xs text-muted">Плейлист</div>
                </div>
              </Link>
              <Link
                href="/library?tab=uploads"
                className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#333] to-[#191919]">
                  <Upload size={18} className="text-ink" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Мои загрузки</div>
                  <div className="truncate text-xs text-muted">Треки</div>
                </div>
              </Link>

              <div className="my-2 h-px bg-white/5" />

              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/5',
                    pathname === `/playlist/${playlist.id}` && 'bg-white/5',
                  )}
                >
                  <Cover
                    cover={playlist.cover}
                    alt={playlist.name}
                    seed={playlist.id}
                    className="h-12 w-12"
                    iconSize={18}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{playlist.name}</div>
                    <div className="truncate text-xs text-muted">
                      Плейлист · {tracksWord(playlist.trackCount)}
                    </div>
                  </div>
                </Link>
              ))}

              <button
                onClick={() => setCreateOpen(true)}
                className="mt-2 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-muted transition hover:bg-white/5 hover:text-ink"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-line">
                  <Plus size={18} />
                </div>
                Создать плейлист
              </button>
              <Link
                href="/import"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-muted transition hover:bg-white/5 hover:text-ink"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-line">
                  <ListPlus size={18} />
                </div>
                Импорт плейлиста
              </Link>
            </>
          ) : (
            <div className="px-3 py-4">
              <p className="text-sm font-medium">Создавайте свои плейлисты</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Войдите, чтобы собирать музыку, ставить лайки и загружать свои треки.
              </p>
              <Link
                href="/register"
                className="mt-3 inline-flex rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-white"
              >
                Создать аккаунт
              </Link>
            </div>
          )}
        </div>
      </div>

      <CreatePlaylistDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </aside>
  )
}
