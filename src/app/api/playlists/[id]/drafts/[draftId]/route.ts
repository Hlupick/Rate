import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deletePlaylistDraft } from '@/lib/queries'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id, draftId } = await params
  const ok = deletePlaylistDraft(draftId, id, user.id)
  if (!ok) return NextResponse.json({ error: 'Не удалось удалить' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
