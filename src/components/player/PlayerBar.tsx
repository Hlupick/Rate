'use client'

import Link from 'next/link'
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from './PlayerProvider'
import { Bar } from '@/components/ui/Bar'
import { TrackAvatar } from '@/components/track/TrackAvatar'
import { LikeButton } from '@/components/track/LikeButton'
import { QueuePanel } from './QueuePanel'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

function IconButton({
  children,
  onClick,
  active,
  label,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  label: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'relative flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:text-ink md:h-9 md:w-9',
        active && 'text-accent',
        className,
      )}
    >
      {children}
      {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" />}
    </button>
  )
}

export function PlayerBar() {
  const {
    current,
    isPlaying,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    queueOpen,
    setQueueOpen,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer()

  const total = duration || current?.duration || 0
  const ratio = total > 0 ? progress / total : 0
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <>
      <QueuePanel />
      <div className="relative flex shrink-0 flex-col gap-1 px-2 pb-2 pt-1 md:h-[92px] md:flex-row md:items-center md:gap-4 md:px-4 md:pb-0 md:pt-0">
        <div
          className="absolute inset-x-2 top-0 flex h-5 items-start md:hidden"
          onPointerDown={(event) => {
            if (!current || total <= 0) return
            const rect = event.currentTarget.getBoundingClientRect()
            const value = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
            seek(value * total)
          }}
        >
          <div className="mt-1 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white" style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>

        <div className="flex w-full min-w-0 items-center gap-2.5 md:contents">
          {/* Now playing */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:w-[28%] md:flex-none md:gap-3">
            {current ? (
              <>
                <TrackAvatar
                  title={current.title}
                  className="h-11 w-11 md:h-14 md:w-14"
                  textClassName="md:text-[11px]"
                />
                <div className="min-w-0">
                  <Link
                    href={`/track/${current.id}`}
                    className="block truncate text-[13px] font-medium hover:underline md:text-sm"
                  >
                    {current.title}
                  </Link>
                  <Link
                    href={`/artist/${encodeURIComponent(current.artist)}`}
                    className="block truncate text-[11px] text-muted transition hover:text-ink hover:underline md:text-xs"
                  >
                    {current.artist}
                  </Link>
                </div>
                <LikeButton
                  key={current.id}
                  trackId={current.id}
                  initialLiked={Boolean(current.liked)}
                  className="ml-auto shrink-0 sm:ml-0"
                />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden h-14 w-14 rounded-md border border-dashed border-line sm:block" />
                <div className="text-xs text-muted md:text-sm">
                  <span className="sm:hidden">Нет трека</span>
                  <span className="hidden sm:inline">Ничего не играет</span>
                  <div className="hidden text-xs text-dim sm:block">Выберите трек в библиотеке</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex w-full items-center gap-1 md:w-auto md:flex-1 md:flex-col md:gap-1.5">
          <div className="flex items-center justify-center gap-1 md:justify-start md:gap-2">
            <IconButton label="Перемешать" active={shuffle} onClick={toggleShuffle}>
              <Shuffle size={16} />
            </IconButton>
            <IconButton label="Предыдущий трек" onClick={prev}>
              <SkipBack size={18} className="fill-current" />
            </IconButton>
            <button
              onClick={toggle}
              aria-label={isPlaying ? 'Пауза' : 'Играть'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black transition hover:scale-105 active:scale-95 disabled:opacity-40 md:h-10 md:w-10"
              disabled={!current}
            >
              {isPlaying ? (
                <Pause size={17} className="fill-current" />
              ) : (
                <Play size={17} className="translate-x-[1px] fill-current" />
              )}
            </button>
            <IconButton label="Следующий трек" onClick={next}>
              <SkipForward size={18} className="fill-current" />
            </IconButton>
            <IconButton
              label={
                repeat === 'one'
                  ? 'Повтор трека'
                  : repeat === 'all'
                    ? 'Повтор плейлиста'
                    : 'Без повтора'
              }
              active={repeat !== 'off'}
              onClick={cycleRepeat}
            >
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </IconButton>
          </div>
          <div className="hidden w-full max-w-[560px] items-center gap-2 text-[11px] tabular-nums text-muted md:flex">
            <span className="w-9 text-right">{formatDuration(progress)}</span>
            <Bar
              value={total > 0 ? progress / total : 0}
              onChange={(value) => seek(value * total)}
              disabled={!current || total <= 0}
              ariaLabel="Позиция трека"
            />
            <span className="w-9">{formatDuration(total)}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="hidden w-[28%] items-center justify-end gap-1 md:flex">
          <IconButton label="Очередь" active={queueOpen} onClick={() => setQueueOpen(!queueOpen)}>
            <ListMusic size={18} />
          </IconButton>
          <IconButton label={muted ? 'Включить звук' : 'Выключить звук'} onClick={toggleMute}>
            <VolumeIcon size={18} />
          </IconButton>
          <div className="w-24">
            <Bar
              value={muted ? 0 : volume}
              onChange={setVolume}
              ariaLabel="Громкость"
              fillClassName="bg-accent"
            />
          </div>
        </div>
      </div>
    </>
  )
}
