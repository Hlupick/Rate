import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { getCurrentUser } from '@/lib/auth'
import { getTrack } from '@/lib/queries'
import { TRACKS_DIR } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function streamResponse(
  filePath: string,
  mimeType: string,
  size: number,
  range: string | null,
) {
  const baseHeaders: Record<string, string> = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
  }

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (match) {
      const start = match[1] ? Number(match[1]) : 0
      let end = match[2] ? Number(match[2]) : size - 1
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        })
      }
      end = Math.min(end, size - 1)
      const nodeStream = fs.createReadStream(filePath, { start, end })
      return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        },
      })
    }
  }

  const nodeStream = fs.createReadStream(filePath)
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    headers: { ...baseHeaders, 'Content-Length': String(size) },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const track = getTrack(id)
  if (!track) return new Response('Not found', { status: 404 })
  if (track.reviewStatus !== 'approved') {
    const user = await getCurrentUser()
    if (!user || (user.id !== track.uploaderId && !user.isModerator)) {
      return new Response('Not found', { status: 404 })
    }
  }

  const filePath = path.join(TRACKS_DIR, track.fileName)
  try {
    const stat = await fsp.stat(filePath)
    return streamResponse(
      filePath,
      track.mimeType,
      stat.size,
      request.headers.get('range'),
    )
  } catch {
    return new Response('File missing', { status: 404 })
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const track = getTrack(id)
  if (!track) return new Response(null, { status: 404 })
  if (track.reviewStatus !== 'approved') {
    const user = await getCurrentUser()
    if (!user || (user.id !== track.uploaderId && !user.isModerator)) {
      return new Response(null, { status: 404 })
    }
  }
  try {
    const stat = await fsp.stat(path.join(TRACKS_DIR, track.fileName))
    return new Response(null, {
      headers: {
        'Content-Type': track.mimeType,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
