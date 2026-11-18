import { getCurrentUser } from '@/lib/auth'
import { getPlaylistsByOwner } from '@/lib/queries'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { PlayerBar } from '@/components/player/PlayerBar'
import Link from 'next/link'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const playlists = user ? getPlaylistsByOwner(user.id) : []
  const profile = user
    ? { displayName: user.displayName, username: user.username, isAdmin: user.isAdmin }
    : null

  return (
    <div className="flex h-dvh flex-col bg-base p-2 pb-0">
      <div className="flex min-h-0 flex-1 gap-2">
        <Sidebar
          user={profile}
          playlists={playlists.map((p) => ({
            id: p.id,
            name: p.name,
            trackCount: p.trackCount,
            cover: p.cover,
          }))}
        />
        <main className="relative min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-panel">
          <TopBar user={profile} />
          <div className="pb-10">{children}</div>
          <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 px-4 py-4 text-[11px] text-dim md:px-6">
            <Link href="/rules" className="transition hover:text-muted">
              Правила
            </Link>
            <Link href="/privacy" className="transition hover:text-muted">
              Конфиденциальность
            </Link>
            <span className="ml-auto">monah · музыку добавляют слушатели</span>
          </footer>
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}
