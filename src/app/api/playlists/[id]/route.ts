import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deletePlaylist, getPlaylist, updatePlaylist } from '@/lib/queries'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  let body: { name?: string; description?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const updated = updatePlaylist(id, user.id, {
    name: body.name ? String(body.name).slice(0, 80) : undefined,
    description: body.description === undefined ? undefined : body.description,
  })
  if (!updated) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  return NextResponse.json({ playlist: getPlaylist(id) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const ok = deletePlaylist(id, user.id)
  if (!ok) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
