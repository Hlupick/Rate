'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CreatePlaylistDialog } from '@/components/playlist/CreatePlaylistDialog'

export function CreatePlaylistButton({ label = 'Создать плейлист' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
      >
        <Plus size={16} /> {label}
      </button>
      <CreatePlaylistDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
