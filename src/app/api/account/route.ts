import fsp from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { destroySession, getCurrentUser } from '@/lib/auth'
import { TRACKS_DIR } from '@/lib/db'
import { removeImageFile, isValidImageName } from '@/lib/storage'
import {
  countAdmins,
  deleteUserAccount,
  getUserPasswordHash,
  updateUserProfile,
  usedImageNames,
  userImageNames,
  userTrackFileNames,
} from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { clampAvatarFrame } from '@/lib/avatar-frame'
import { hasFrameAccess } from '@/lib/frames'
import { clampStatus, clampStatusColor } from '@/lib/status'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: {
    displayName?: string
    bio?: string | null
    status?: string | null
    statusColor?: string | null
    avatar?: string | null
    cover?: string | null
    avatarFrame?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  for (const field of ['avatar', 'cover'] as const) {
    const value = body[field]
    if (value !== undefined && value !== null && !isValidImageName(value)) {
      return NextResponse.json({ error: 'Некорректное изображение' }, { status: 400 })
    }
  }

  if (body.avatarFrame !== undefined) {
    const frame = clampAvatarFrame(body.avatarFrame)
    if (!hasFrameAccess(user.id, frame)) {
      return NextResponse.json({ error: 'Сначала купите этот ободок' }, { status: 403 })
    }
  }

  const patch = {
    displayName:
      body.displayName === undefined ? undefined : String(body.displayName).trim().slice(0, 40),
    bio:
      body.bio === undefined
        ? undefined
        : body.bio === null
          ? null
          : String(body.bio).trim().slice(0, 300) || null,
    status:
      body.status === undefined
        ? undefined
        : body.status === null
          ? null
          : clampStatus(String(body.status)) || null,
    statusColor:
      body.statusColor === undefined || body.statusColor === null
        ? undefined
        : clampStatusColor(body.statusColor),
    avatar: body.avatar === undefined ? undefined : body.avatar,
    cover: body.cover === undefined ? undefined : body.cover,
    avatarFrame:
      body.avatarFrame === undefined ? undefined : clampAvatarFrame(body.avatarFrame),
  }
  if (patch.displayName !== undefined && patch.displayName.length < 2) {
    return NextResponse.json({ error: 'Имя слишком короткое' }, { status: 400 })
  }

  const updated = updateUserProfile(user.id, patch)
  if (!updated) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  const stillUsed = usedImageNames()
  await Promise.all([
    removeImageFile(user.avatar, stillUsed),
    removeImageFile(user.cover, stillUsed),
  ])

  return NextResponse.json({ user: updated })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`delete-account:${user.id}:${clientIp(request)}`, 5, 15 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  if (!bcrypt.compareSync(body.password ?? '', getUserPasswordHash(user.id) ?? '')) {
    return NextResponse.json({ error: 'Пароль неверный' }, { status: 400 })
  }
  if (user.isAdmin && countAdmins() <= 1) {
    return NextResponse.json(
      { error: 'Нельзя удалить единственного администратора' },
      { status: 400 },
    )
  }

  const audioFiles = userTrackFileNames(user.id)
  const images = userImageNames(user.id)

  if (!deleteUserAccount(user.id)) {
    return NextResponse.json({ error: 'Не удалось удалить аккаунт' }, { status: 400 })
  }
  await destroySession()

  await Promise.all(
    audioFiles.map((file) =>
      fsp.unlink(path.join(TRACKS_DIR, path.basename(file))).catch(() => undefined),
    ),
  )

  const stillUsed = usedImageNames()
  await Promise.all(images.map((name) => removeImageFile(name, stillUsed)))

  return NextResponse.json({ ok: true })
}
