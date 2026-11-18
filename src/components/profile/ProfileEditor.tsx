'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Pencil, Sparkles, Check } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { ImagePicker } from '@/components/ui/ImagePicker'
import { StatusPill } from '@/components/profile/StatusPill'
import {
  AVATAR_FRAMES,
  avatarFrameTheme,
  canUseExclusiveFrame,
  clampAvatarFrame,
  isExclusiveFrame,
  type AvatarFrame,
} from '@/lib/avatar-frame'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  STATUS_COLORS,
  STATUS_PRESETS,
  canUseStatus,
  resolveStatus,
  statusColorTheme,
} from '@/lib/status'

export function ProfileEditor({
  displayName,
  bio,
  status,
  statusColor,
  avatar,
  cover,
  avatarFrame,
  points,
  ownedFrames,
  isAdmin = false,
  isModerator = false,
  username,
}: {
  displayName: string
  bio: string | null
  status: string | null
  statusColor: string
  avatar: string | null
  cover: string | null
  avatarFrame: string
  points: number
  ownedFrames: string[]
  isAdmin?: boolean
  isModerator?: boolean
  username: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(displayName)
  const [about, setAbout] = useState(bio ?? '')
  const [label, setLabel] = useState<string>(resolveStatus(status)?.key ?? '')
  const [tint, setTint] = useState(statusColor)
  const [newAvatar, setNewAvatar] = useState(avatar)
  const [newCover, setNewCover] = useState(cover)
  const [frame, setFrame] = useState<AvatarFrame>(clampAvatarFrame(avatarFrame))
  const [balance, setBalance] = useState(points)
  const [owned, setOwned] = useState<string[]>(ownedFrames)
  const [pendingBuy, setPendingBuy] = useState<AvatarFrame | null>(null)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function chooseFrame(theme: (typeof AVATAR_FRAMES)[number]) {
    const locked = theme.tier === 'premium' && !isAdmin && !owned.includes(theme.key)
    if (locked) {
      setBuyError('')
      setPendingBuy(theme.key)
      return
    }
    setPendingBuy(null)
    setBuyError('')
    setFrame(theme.key)
  }

  async function buy() {
    if (!pendingBuy || buying) return
    setBuying(true)
    setBuyError('')
    try {
      const response = await fetch('/api/frames/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: pendingBuy }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        points?: number
        owned?: string[]
      }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось купить ободок')
      if (typeof data.points === 'number') setBalance(data.points)
      if (Array.isArray(data.owned)) setOwned(data.owned)
      setFrame(pendingBuy)
      setPendingBuy(null)
      router.refresh()
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Не удалось купить ободок')
    } finally {
      setBuying(false)
    }
  }

  async function save() {
    if (name.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: name.trim(),
          bio: about.trim() || null,
          status: label || null,
          statusColor: tint,
          avatar: newAvatar,
          cover: newCover,
          avatarFrame: frame,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сохранить')
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  const pendingTheme = pendingBuy ? avatarFrameTheme(pendingBuy) : null
  const shortfall = pendingTheme ? Math.max(0, pendingTheme.price - balance) : 0
  const statusOptions = STATUS_PRESETS.filter((preset) =>
    canUseStatus(preset.key, { username, isModerator }),
  )
  const visibleFrames = AVATAR_FRAMES.filter((theme) => !isExclusiveFrame(theme.key))
  const exclusiveFrames = AVATAR_FRAMES.filter(
    (theme) => isExclusiveFrame(theme.key) && canUseExclusiveFrame(theme.key, username),
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-md transition hover:border-white/25 hover:bg-black/60 hover:text-ink"
      >
        <Pencil size={13} /> Редактировать профиль
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Редактировать профиль">
        <div className="space-y-4">
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            <ImagePicker
              label="Аватар"
              shape="circle"
              maxSize={512}
              value={newAvatar}
              onChange={setNewAvatar}
            />

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-muted">Ободок аватара</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200">
                  <Sparkles size={12} /> {formatCount(balance)} баллов
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {visibleFrames.map((theme) => {
                  const locked = theme.tier === 'premium' && !isAdmin && !owned.includes(theme.key)
                  const active = frame === theme.key
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => chooseFrame(theme)}
                      aria-pressed={active}
                      title={
                        locked
                          ? `${theme.label} — ${formatCount(theme.price)} баллов`
                          : theme.label
                      }
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition',
                        active ? 'bg-white/10 ring-1 ring-inset ring-white/20' : 'hover:bg-white/5',
                      )}
                    >
                      <span className="relative">
                        <Avatar
                          name={name || 'Rate'}
                          src={newAvatar}
                          frame={theme.key}
                          className="h-10 w-10"
                          textClassName="text-[10px]"
                        />
                        {locked && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black ring-1 ring-white/25">
                            <Lock size={9} className="text-amber-200" />
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'w-full truncate text-center text-[10px] font-medium leading-tight',
                          active ? 'text-ink' : 'text-muted',
                        )}
                      >
                        {theme.key === 'none' ? 'Без' : theme.label}
                      </span>
                      <span
                        className={cn(
                          'h-3 text-[9px] leading-none',
                          theme.tier === 'premium'
                            ? locked
                              ? 'text-amber-200/80'
                              : 'text-emerald-300/80'
                            : 'text-transparent',
                        )}
                      >
                        {theme.tier === 'premium'
                          ? locked
                            ? `${formatCount(theme.price)} б.`
                            : isAdmin
                              ? 'доступен'
                              : 'куплен'
                          : '·'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {exclusiveFrames.length > 0 && (
                <div className="space-y-1.5">
                  {exclusiveFrames.map((theme) => {
                    const active = frame === theme.key
                    return (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() => chooseFrame(theme)}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                          active
                            ? 'border-white/25 bg-white/10'
                            : 'border-white/10 bg-gradient-to-r from-white/[0.07] to-transparent hover:bg-white/5',
                        )}
                      >
                        <Avatar
                          name={name || 'Rate'}
                          src={newAvatar}
                          frame={theme.key}
                          animated
                          className="h-11 w-11"
                          textClassName="text-xs"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">
                            {theme.label}
                            <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/70">
                              эксклюзив
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[10px] text-amber-200/80">
                            Только для @{username}
                          </span>
                        </span>
                        {active && <Check size={14} className="shrink-0 text-emerald-300" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {pendingTheme && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="text-xs font-medium">
                    Купить «{pendingTheme.label}» за {formatCount(pendingTheme.price)} баллов?
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Останется {formatCount(Math.max(0, balance - pendingTheme.price))} баллов.
                    Ободок останется навсегда.
                  </p>
                  {shortfall > 0 && (
                    <p className="mt-1 text-[11px] text-amber-300">
                      Не хватает {formatCount(shortfall)} баллов. Послушайте музыку или загрузите
                      трек.
                    </p>
                  )}
                  {buyError && <p className="mt-1 text-[11px] text-red-400">{buyError}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void buy()}
                      disabled={buying || shortfall > 0}
                      className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-white disabled:opacity-40"
                    >
                      {buying ? 'Покупаем…' : 'Купить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingBuy(null)}
                      className="rounded-full px-3 py-1.5 text-xs text-muted transition hover:text-ink"
                    >
                      Не сейчас
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] leading-relaxed text-muted">
                Пять ободков бесплатны. Премиальные открываются за баллы: 1 балл за минуту
                прослушивания и 40 баллов за загруженный трек.
              </p>
            </div>

            <ImagePicker
              label="Обложка профиля"
              shape="banner"
              value={newCover}
              onChange={setNewCover}
            />
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted" htmlFor="profile-name">
                Имя
              </label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                className="input"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted">Статус</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setLabel('')}
                  aria-pressed={!label}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
                    !label
                      ? 'border-white/40 bg-white/10 text-ink'
                      : 'border-white/10 bg-black/30 text-muted hover:border-white/25 hover:text-ink',
                  )}
                >
                  Без статуса
                </button>
                {statusOptions.map((preset) => {
                  const active = label === preset.key
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setLabel(active ? '' : preset.key)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border p-0.5 transition',
                        active
                          ? 'border-white/45 bg-white/10'
                          : 'border-transparent hover:bg-white/5',
                      )}
                    >
                      <StatusPill
                        text={preset.key}
                        color={preset.key === 'boss' ? undefined : tint}
                        className="py-0.5 text-[12px]"
                      />
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted">
                Готовая подпись рядом с ником. Нажмите выбранную ещё раз, чтобы снять.
              </p>
              {label === 'boss' || label === 'koto' ? (
                <p className="pt-1 text-[11px] text-muted">
                  {label === 'boss'
                    ? 'У «ПРОСТО БОСС» свой стальной стиль — цвет не выбирается.'
                    : 'У «КОТОСТИ» свой тёплый стиль с фотографией — цвет не выбирается.'}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <span className="text-[11px] text-muted">Цвет:</span>
                  {STATUS_COLORS.map((color) => (
                    <button
                      key={color.key}
                      type="button"
                      onClick={() => setTint(color.key)}
                      title={color.label}
                      aria-label={color.label}
                      aria-pressed={tint === color.key}
                      className={cn(
                        'h-7 w-7 rounded-full border border-white/20 transition',
                        statusColorTheme(color.key).dot,
                        tint === color.key
                          ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-black'
                          : 'opacity-80 hover:opacity-100',
                      )}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted">Так появится в профиле:</span>
                {label ? (
                  <StatusPill text={label} color={tint} className="py-0.5 text-[12px]" />
                ) : (
                  <span className="text-[11px] text-muted">— скрыто</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted" htmlFor="profile-bio">
                О себе
              </label>
              <textarea
                id="profile-bio"
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                rows={3}
                maxLength={300}
                className="input resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-ink"
            >
              Отмена
            </button>
            <button
              onClick={() => void save()}
              disabled={busy || name.trim().length < 2}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-40"
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
