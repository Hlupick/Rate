import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { desktopFilePath, readDesktopFile } from '@/lib/desktop-release'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Serves the Windows installer or the portable build from the storage volume. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params
  if (file !== 'setup' && file !== 'portable') {
    return NextResponse.json({ error: 'Сборка не найдена' }, { status: 404 })
  }

  const release = await readDesktopFile(file)
  if (!release) {
    return NextResponse.json({ error: 'Сборка ещё не опубликована' }, { status: 404 })
  }

  const target = release.target
  const stream = Readable.toWeb(createReadStream(desktopFilePath(target.file))) as ReadableStream
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${target.file}"`,
      'Content-Length': String(target.size),
      'Cache-Control': 'public, max-age=300',
    },
  })
}
