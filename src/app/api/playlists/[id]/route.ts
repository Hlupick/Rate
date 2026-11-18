import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deletePlaylist, getPlaylist, updatePlaylist, usedImageNames } from '@/lib/queries'
import { isValidImageName, removeImageFile } from '@/lib/storage'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  let body: {
    name?: string
    description?: string | null
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

  const previous = getPlaylist(id)
  const updated = updatePlaylist(id, user.id, {
    name: body.name === undefined ? undefined : String(body.name).trim().slice(0, 80),
    description:
      body.description === undefined
        ? undefined
        : body.description === null
          ? null
          : String(body.description).trim().slice(0, 200) || null,
    avatar: body.avatar === undefined ? undefined : body.avatar,
    cover: body.cover === undefined ? undefined : body.cover,
  })
  if (!updated) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  if (previous) {
    const stillUsed = usedImageNames()
    await Promise.all([
      removeImageFile(previous.avatar, stillUsed),
      removeImageFile(previous.cover, stillUsed),
    ])
  }
  return NextResponse.json({ playlist: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const removed = deletePlaylist(id, user.id)
  if (!removed) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  const stillUsed = usedImageNames()
  await Promise.all([
    removeImageFile(removed.avatar, stillUsed),
    removeImageFile(removed.cover, stillUsed),
  ])
  return NextResponse.json({ ok: true })
}
