import { NextResponse } from 'next/server'
import { BUILD_ID } from '@/lib/build'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
