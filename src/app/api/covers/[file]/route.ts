import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { COVERS_DIR } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params
  const safe = path.basename(decodeURIComponent(file))
  const type = TYPES[path.extname(safe).toLowerCase()]
  if (!type) return new Response('Not found', { status: 404 })

  const filePath = path.join(COVERS_DIR, safe)
  try {
    await fsp.access(filePath)
    const nodeStream = fs.createReadStream(filePath)
    return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
