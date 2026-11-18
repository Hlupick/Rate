'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function SearchInput() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const id = window.setTimeout(() => {
      const q = value.trim()
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { scroll: false })
    }, 280)
    return () => window.clearTimeout(id)
  }, [value, router])

  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Треки, люди, исполнители, плейлисты…"
        className="h-11 w-full rounded-full border border-transparent bg-card pl-11 pr-11 text-sm placeholder:text-dim transition focus:border-white/30 focus:bg-card-hover"
        aria-label="Поиск"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Очистить"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
