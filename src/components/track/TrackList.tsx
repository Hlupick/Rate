'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, GripVertical } from 'lucide-react'
import { TrackRow } from './TrackRow'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TrackList({
  tracks,
  viewerId,
  label,
  playlistId,
  showAlbum = true,
  showDate = false,
  showHeader = true,
  reorderable = false,
}: {
  tracks: Track[]
  viewerId?: string | null
  label?: string
  playlistId?: string
  showAlbum?: boolean
  showDate?: boolean
  showHeader?: boolean
  reorderable?: boolean
}) {
  const [order, setOrder] = useState(tracks)
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    setOrder(tracks)
  }, [tracks])

  async function drop(index: number) {
    const from = dragFrom.current
    dragFrom.current = null
    setDragOver(null)
    if (from === null) return

    const next = [...order]
    const [moved] = next.splice(from, 1)
    const insertAt = from < index ? index - 1 : index
    if (insertAt === from) return
    next.splice(insertAt, 0, moved)
    setOrder(next)

    if (playlistId) {
      await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: next.map((track) => track.id) }),
      }).catch(() => undefined)
    }
  }

  return (
    <div>
      {showHeader && (
        <div className="mb-1 flex items-center gap-3 border-b border-white/5 px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted md:px-3">
          <div className="w-5 text-right">#</div>
          <div className="flex-1">Название</div>
          {showAlbum && <div className="hidden w-[24%] lg:block">Альбом</div>}
          {showDate && <div className="hidden w-[12%] xl:block">Добавлено</div>}
          <div className="flex w-[104px] justify-end pr-1">
            <Clock size={14} />
          </div>
        </div>
      )}
      <div className="space-y-0.5">
        {order.map((track, index) => (
          <div
            key={track.id}
            draggable={reorderable}
            onDragStart={(event) => {
              dragFrom.current = index
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(event) => {
              if (!reorderable) return
              event.preventDefault()
              setDragOver(index)
            }}
            onDragLeave={() => setDragOver((value) => (value === index ? null : value))}
            onDrop={(event) => {
              if (!reorderable) return
              event.preventDefault()
              void drop(index)
            }}
            onDragEnd={() => {
              dragFrom.current = null
              setDragOver(null)
            }}
            className={cn(
              'group/row relative rounded-md',
              reorderable && 'pl-4 cursor-grab active:cursor-grabbing',
              dragOver === index && reorderable && 'ring-1 ring-white/30',
            )}
          >
            {reorderable && (
              <span className="pointer-events-none absolute left-0.5 top-1/2 hidden -translate-y-1/2 text-dim group-hover/row:block">
                <GripVertical size={13} />
              </span>
            )}
            <TrackRow
              track={track}
              index={index}
              list={order}
              label={label}
              viewerId={viewerId}
              showAlbum={showAlbum}
              showDate={showDate}
              playlistId={playlistId}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
