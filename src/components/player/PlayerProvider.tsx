'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { coverUrl } from '@/lib/format'

export type PlayerTrack = {
  id: string
  title: string
  artist: string
  album?: string | null
  duration: number
  cover: string | null
  liked?: boolean
}

type Repeat = 'off' | 'all' | 'one'

type PlayerApi = {
  queue: PlayerTrack[]
  current: PlayerTrack | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: Repeat
  queueOpen: boolean
  contextLabel: string
  play: (track: PlayerTrack, list?: PlayerTrack[], label?: string) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setQueueOpen: (open: boolean) => void
  addToQueue: (track: PlayerTrack) => void
  playNext: (track: PlayerTrack) => void
  removeFromQueue: (trackId: string) => void
}

const PlayerContext = createContext<PlayerApi | null>(null)

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}

const streamUrl = (id: string) => `/api/stream/${id}`
const STORAGE_KEY = 'monah:player'

type MediaActionDetails = { seekTime?: number; seekOffset?: number }
type MediaSessionLike = {
  metadata: unknown | null
  playbackState: 'none' | 'paused' | 'playing'
  setActionHandler: (
    action: string,
    handler: ((details: MediaActionDetails) => void) | null,
  ) => void
  setPositionState?: (state: {
    duration: number
    position: number
    playbackRate: number
  }) => void
}
type ScreenLock = {
  release: () => Promise<void>
  addEventListener: (type: string, listener: () => void) => void
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [queue, setQueue] = useState<PlayerTrack[]>([])
  const [current, setCurrent] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [queueOpen, setQueueOpen] = useState(false)
  const [contextLabel, setContextLabel] = useState('')

  const currentRef = useRef<PlayerTrack | null>(null)
  const queueRef = useRef<PlayerTrack[]>([])
  const playedRef = useRef<Set<string>>(new Set())
  const restoreTimeRef = useRef(0)

  currentRef.current = current
  queueRef.current = queue

  /* ------------------------------ persistence ----------------------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as {
        current?: PlayerTrack | null
        queue?: PlayerTrack[]
        volume?: number
        muted?: boolean
        progress?: number
        shuffle?: boolean
        repeat?: Repeat
        contextLabel?: string
      }
      if (typeof saved.volume === 'number') setVolumeState(saved.volume)
      if (typeof saved.muted === 'boolean') setMuted(saved.muted)
      if (saved.shuffle) setShuffle(true)
      if (saved.repeat) setRepeat(saved.repeat)
      if (saved.contextLabel) setContextLabel(saved.contextLabel)
      if (saved.current) {
        setCurrent(saved.current)
        setQueue(Array.isArray(saved.queue) ? saved.queue : [saved.current])
        restoreTimeRef.current = saved.progress ?? 0
        const audio = audioRef.current
        if (audio) {
          audio.src = streamUrl(saved.current.id)
          audio.dataset.track = saved.current.id
          audio.addEventListener(
            'loadedmetadata',
            () => {
              if (restoreTimeRef.current > 0) audio.currentTime = restoreTimeRef.current
              setProgress(restoreTimeRef.current)
            },
            { once: true },
          )
        }
      }
    } catch {
      /* ignore corrupted state */
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  const save = useCallback(() => {
    const audio = audioRef.current
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          current: currentRef.current,
          queue: queueRef.current,
          volume: audio?.volume ?? volume,
          muted: audio?.muted ?? muted,
          progress: audio?.currentTime ?? 0,
          shuffle,
          repeat,
          contextLabel,
        }),
      )
    } catch {
      /* storage full */
    }
  }, [volume, muted, shuffle, repeat, contextLabel])

  useEffect(() => {
    save()
  }, [current, queue, save])

  useEffect(() => {
    const id = window.setInterval(save, 5000)
    return () => window.clearInterval(id)
  }, [save])

  const load = useCallback((track: PlayerTrack, autoplay = true) => {
    const audio = audioRef.current
    if (!audio) return
    const same = audio.dataset.track === track.id
    if (!same) {
      audio.src = streamUrl(track.id)
      audio.dataset.track = track.id
      audio.load()
    } else {
      audio.currentTime = 0
    }
    setProgress(0)
    setDuration(track.duration)
    if (autoplay) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }, [])

  const play = useCallback(
    (track: PlayerTrack, list?: PlayerTrack[], label?: string) => {
      const nextQueue =
        list && list.length > 0
          ? list
          : queueRef.current.some((t) => t.id === track.id)
            ? queueRef.current
            : [...queueRef.current, track]
      setQueue(nextQueue)
      setCurrent(track)
      if (label !== undefined) setContextLabel(label)
      currentRef.current = track
      load(track, true)
    },
    [load],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentRef.current) return
    if (audio.paused) {
      if (!audio.src) {
        load(currentRef.current, true)
        return
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [load])

  const goTo = useCallback(
    (offset: number) => {
      const track = currentRef.current
      const list = queueRef.current
      if (!track || list.length === 0) return
      if (offset > 0 && repeat === 'one') {
        load(track, true)
        return
      }
      const index = list.findIndex((t) => t.id === track.id)
      if (shuffle && list.length > 1) {
        let pick = index
        while (pick === index) pick = Math.floor(Math.random() * list.length)
        play(list[pick], list)
        return
      }
      let nextIndex = index + offset
      if (nextIndex >= list.length) {
        if (repeat === 'all') nextIndex = 0
        else {
          const audio = audioRef.current
          audio?.pause()
          setIsPlaying(false)
          setProgress(0)
          return
        }
      }
      if (nextIndex < 0) nextIndex = 0
      play(list[nextIndex], list)
    },
    [load, play, repeat, shuffle],
  )

  const next = useCallback(() => goTo(1), [goTo])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      setProgress(0)
      return
    }
    goTo(-1)
  }, [goTo])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seconds
    const value = Math.max(0, Math.min(max, seconds))
    audio.currentTime = value
    setProgress(value)
  }, [])

  const setVolume = useCallback((value: number) => {
    const v = Math.max(0, Math.min(1, value))
    setVolumeState(v)
    if (v > 0) setMuted(false)
  }, [])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), [])
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    [],
  )

  const addToQueue = useCallback((track: PlayerTrack) => {
    setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]))
  }, [])

  const playNext = useCallback((track: PlayerTrack) => {
    setQueue((q) => {
      const index = currentRef.current ? q.findIndex((t) => t.id === currentRef.current!.id) : -1
      const without = q.filter((t) => t.id !== track.id)
      const insertAt = index >= 0 ? index + 1 : without.length
      return [...without.slice(0, insertAt), track, ...without.slice(insertAt)]
    })
  }, [])

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((q) => q.filter((t) => t.id !== trackId))
  }, [])

  /* -------------------------------- events ------------------------------- */

  const progressRef = useRef(0)
  progressRef.current = progress

  const lastPositionRef = useRef(0)
  const publishPosition = (audio: HTMLAudioElement, force = false) => {
    const session = (navigator as unknown as { mediaSession?: MediaSessionLike }).mediaSession
    if (!session?.setPositionState) return
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
    const now = Date.now()
    if (!force && now - lastPositionRef.current < 1000) return
    lastPositionRef.current = now
    try {
      session.setPositionState({
        duration: audio.duration,
        position: Math.min(audio.currentTime, audio.duration),
        playbackRate: audio.playbackRate || 1,
      })
    } catch {
      /* some browsers reject position updates for short files */
    }
  }

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget
    setProgress(audio.currentTime)
    if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
    publishPosition(audio)
    const track = currentRef.current
    if (track && !playedRef.current.has(track.id)) {
      const threshold = Math.min(30, (audio.duration || track.duration) * 0.5)
      if (audio.currentTime >= threshold && threshold > 0) {
        playedRef.current.add(track.id)
        fetch('/api/plays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: track.id }),
        }).catch(() => undefined)
      }
    }
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return
      if (event.code === 'Space') {
        event.preventDefault()
        toggle()
      } else if (event.code === 'ArrowRight' && event.shiftKey) {
        next()
      } else if (event.code === 'ArrowLeft' && event.shiftKey) {
        prev()
      } else if (event.code === 'ArrowRight') {
        seek(progressRef.current + 5)
      } else if (event.code === 'ArrowLeft') {
        seek(progressRef.current - 5)
      } else if (event.code === 'KeyM') {
        toggleMute()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, seek, toggle, toggleMute])

  /* -------------------------- Android media keys -------------------------- */

  useEffect(() => {
    const session = (navigator as unknown as { mediaSession?: MediaSessionLike }).mediaSession
    if (!session) return
    const MediaMetadataCtor = (
      window as unknown as { MediaMetadata?: new (data: Record<string, unknown>) => unknown }
    ).MediaMetadata
    if (!MediaMetadataCtor) return

    if (!current) {
      session.metadata = null
      session.playbackState = 'none'
      return
    }

    const ext = current.cover?.split('.').pop()?.toLowerCase()
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const artwork = current.cover
      ? [
          {
            src: new URL(coverUrl(current.cover)!, window.location.origin).href,
            sizes: '512x512',
            type,
          },
        ]
      : []

    session.metadata = new MediaMetadataCtor({
      title: current.title,
      artist: current.artist,
      album: current.album ?? '',
      artwork,
    })
    session.playbackState = isPlaying ? 'playing' : 'paused'
  }, [current, isPlaying])

  useEffect(() => {
    const session = (navigator as unknown as { mediaSession?: MediaSessionLike }).mediaSession
    if (!session) return

    const handlers: [string, (details: MediaActionDetails) => void][] = [
      [
        'play',
        () => {
          if (!currentRef.current) return
          void audioRef.current?.play().catch(() => undefined)
        },
      ],
      ['pause', () => audioRef.current?.pause()],
      ['stop', () => {
        audioRef.current?.pause()
        setProgress(0)
      }],
      ['previoustrack', () => prev()],
      ['nexttrack', () => next()],
      ['seekto', (details) => seek(details.seekTime ?? 0)],
      ['seekbackward', (details) => seek(progressRef.current - (details.seekOffset ?? 10))],
      ['seekforward', (details) => seek(progressRef.current + (details.seekOffset ?? 10))],
    ]

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler)
      } catch {
        /* action is not supported by this browser */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null)
        } catch {
          /* ignore */
        }
      }
    }
  }, [next, prev, seek])

  /* Keep the screen on while music plays; re-acquire after returning to the app. */
  useEffect(() => {
    if (!isPlaying) return
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<ScreenLock> }
      }
    ).wakeLock
    if (!wakeLock) return

    let cancelled = false
    let lock: ScreenLock | null = null

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const nextLock = await wakeLock.request('screen')
        if (cancelled) {
          void nextLock.release().catch(() => undefined)
          return
        }
        lock = nextLock
        lock.addEventListener('release', () => {
          lock = null
        })
      } catch {
        /* battery saver or browser policy denied the lock */
      }
    }

    void acquire()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (lock) void lock.release().catch(() => undefined)
      lock = null
    }
  }, [isPlaying])

  const value = useMemo<PlayerApi>(
    () => ({
      queue,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      queueOpen,
      contextLabel,
      play,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setQueueOpen,
      addToQueue,
      playNext,
      removeFromQueue,
    }),
    [
      queue,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      queueOpen,
      contextLabel,
      play,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      addToQueue,
      playNext,
      removeFromQueue,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => next()}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
          publishPosition(audio, true)
        }}
        className="hidden"
      />
    </PlayerContext.Provider>
  )
}
