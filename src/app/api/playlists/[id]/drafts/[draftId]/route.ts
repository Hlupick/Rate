import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deletePlaylistDraft } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id, draftId } = await params
  if (!deletePlaylistDraft(draftId, id, user.id)) {
    return NextResponse.json({ error: 'Черновик не найден' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
