'use client'

import { X } from 'lucide-react'
import { usePlayer } from './PlayerProvider'
import { Cover } from '@/components/ui/Cover'
import { formatDuration, tracksWord } from '@/lib/format'
import { cn } from '@/lib/utils'

export function QueuePanel() {
  const { queue, current, queueOpen, setQueueOpen, play, removeFromQueue, isPlaying } = usePlayer()

  if (!queueOpen) return null

  return (
    <div className="fixed bottom-[136px] right-2 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 flex w-[min(380px,calc(100vw-16px))] flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl md:bottom-[100px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Очередь</div>
          <div className="text-xs text-muted">{tracksWord(queue.length)}</div>
        </div>
        <button
          onClick={() => setQueueOpen(false)}
          className="rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
          aria-label="Закрыть очередь"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted">
            Очередь пуста. Добавьте треки из библиотеки.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {queue.map((track, index) => {
              const active = current?.id === track.id
              return (
                <li key={`${track.id}-${index}`}>
                  <div
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/5',
                      active && 'bg-white/5',
                    )}
                  >
                    <button
                      onClick={() => play(track, queue)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative">
                        <Cover
                          cover={track.cover}
                          alt={track.title}
                          seed={track.artist}
                          className="h-10 w-10"
                          iconSize={16}
                        />
                        {active && (
                          <div className="absolute inset-0 flex items-end justify-center gap-[2px] rounded-md bg-black/45 pb-2">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className={cn('h-2 w-[2px] rounded-full bg-white', isPlaying && 'eq-bar')}
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={cn('truncate text-sm', active && 'text-accent')}>
                          {track.title}
                        </div>
                        <div className="truncate text-xs text-muted">{track.artist}</div>
                      </div>
                    </button>
                    <span className="text-[11px] tabular-nums text-dim">
                      {formatDuration(track.duration)}
                    </span>
                    {!active && (
                      <button
                        onClick={() => removeFromQueue(track.id)}
                        className="rounded p-2 text-dim transition hover:text-ink"
                        aria-label="Убрать из очереди"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
