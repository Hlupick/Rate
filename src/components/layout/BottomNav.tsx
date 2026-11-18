'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Library, ListMusic, Search, Upload } from 'lucide-react'
import { usePlayer } from '@/components/player/PlayerProvider'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/search', label: 'Поиск', icon: Search },
  { href: '/library', label: 'Медиатека', icon: Library },
  { href: '/upload', label: 'Загрузить', icon: Upload },
]

export function BottomNav() {
  const pathname = usePathname()
  const { queueOpen, setQueueOpen } = usePlayer()

  return (
    <nav className="flex shrink-0 items-stretch border-t border-white/5 bg-panel-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium transition',
              active ? 'text-ink' : 'text-muted',
            )}
          >
            <item.icon size={19} strokeWidth={active ? 2.4 : 1.8} />
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={() => setQueueOpen(!queueOpen)}
        aria-label="Очередь воспроизведения"
        className={cn(
          'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium transition',
          queueOpen ? 'text-accent' : 'text-muted',
        )}
      >
        <ListMusic size={19} strokeWidth={queueOpen ? 2.4 : 1.8} />
        Очередь
      </button>
    </nav>
  )
}
