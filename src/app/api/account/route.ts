import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { removeImageFile, isValidImageName } from '@/lib/storage'
import { updateUserProfile, usedImageNames } from '@/lib/queries'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: {
    displayName?: string
    bio?: string | null
    avatar?: string | null
    cover?: string | null
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

  const patch = {
    displayName:
      body.displayName === undefined ? undefined : String(body.displayName).trim().slice(0, 40),
    bio:
      body.bio === undefined
        ? undefined
        : body.bio === null
          ? null
          : String(body.bio).trim().slice(0, 300) || null,
    avatar: body.avatar === undefined ? undefined : body.avatar,
    cover: body.cover === undefined ? undefined : body.cover,
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
