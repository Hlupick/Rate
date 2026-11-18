import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { QUOTAS, diskFreeBytes, formatBytes } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tracks = Number((db.prepare('SELECT COUNT(*) AS n FROM tracks').get() as { n: number }).n)
    const users = Number((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n)
    const free = await diskFreeBytes()
    const healthy = free > QUOTAS.minFreeBytes / 4

    return NextResponse.json(
      {
        ok: healthy,
        tracks,
        users,
        freeBytes: free,
        free: formatBytes(free),
        minFree: formatBytes(QUOTAS.minFreeBytes),
        time: new Date().toISOString(),
      },
      { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'unknown' },
      { status: 503 },
    )
  }
}
