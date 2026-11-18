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

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget
    setProgress(audio.currentTime)
    if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
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
        }}
        className="hidden"
      />
    </PlayerContext.Provider>
  )
}
