import { NextResponse } from 'next/server'
import { pushConfigured, pushPublicKey } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { enabled: pushConfigured(), publicKey: pushPublicKey() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
