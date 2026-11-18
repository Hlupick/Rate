import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  addTrackToPlaylist,
  deletePlaylistDraft,
  getPlaylist,
  getPlaylistDrafts,
  listTracks,
} from '@/lib/queries'
import { createMatcher } from '@/lib/matching'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const playlist = getPlaylist(id)
  if (!playlist) return NextResponse.json({ error: 'Плейлист не найден' }, { status: 404 })
  if (playlist.ownerId !== user.id) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const drafts = getPlaylistDrafts(id)
  if (drafts.length === 0) return NextResponse.json({ added: 0, left: 0 })

  const matcher = createMatcher(
    listTracks({ limit: 5000 }).map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
    })),
  )

  let added = 0
  for (const draft of drafts) {
    const trackId = matcher({ title: draft.title, artist: draft.artist })
    if (!trackId) continue
    addTrackToPlaylist(id, trackId, user.id)
    deletePlaylistDraft(draft.id, id, user.id)
    added += 1
  }

  return NextResponse.json({ added, left: drafts.length - added })
}
