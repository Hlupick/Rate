import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { listTracks, type TrackFilter } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 50
const SORTS = new Set(['new', 'oldest', 'popular'])

function text(value: string | null, max: number): string | undefined {
  const trimmed = (value ?? '').trim().slice(0, max)
  return trimmed || undefined
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  const url = new URL(request.url)

  const requested = Number(url.searchParams.get('limit') ?? MAX_LIMIT)
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(requested)))
    : MAX_LIMIT
  const requestedOffset = Number(url.searchParams.get('offset') ?? 0)
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0

  const sortParam = url.searchParams.get('sort')
  const sort = sortParam && SORTS.has(sortParam) ? (sortParam as TrackFilter['sort']) : undefined
  const scope = url.searchParams.get('scope')

  if ((scope === 'likes' || scope === 'uploads') && !user) {
    return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })
  }

  const filter: TrackFilter = {
    limit: limit + 1,
    offset,
    viewerId: user?.id ?? null,
    q: text(url.searchParams.get('q'), 100),
    artist: text(url.searchParams.get('artist'), 120),
    genre: text(url.searchParams.get('genre'), 60),
    sort,
  }

  if (scope === 'likes' && user) filter.likedBy = user.id
  if (scope === 'uploads' && user) filter.uploaderId = user.id

  const rows = listTracks(filter)
  const hasMore = rows.length > limit

  return NextResponse.json({ tracks: rows.slice(0, limit), hasMore })
}
