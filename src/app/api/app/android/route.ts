import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { readAppRelease } from '@/lib/app-release'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Serves the signed Android build straight from the storage volume. */
export async function GET() {
  const release = await readAppRelease()
  if (!release) {
    return NextResponse.json({ error: 'Сборка ещё не опубликована' }, { status: 404 })
  }

  const stream = Readable.toWeb(createReadStream(release.file)) as ReadableStream
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="monah-${release.versionName}.apk"`,
      'Content-Length': String(release.size),
      'Cache-Control': 'public, max-age=300',
    },
  })
}
