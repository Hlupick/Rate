import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import {
  MAX_IMAGE_BYTES,
  detectImageExtension,
  saveImageFile,
  sweepOrphanImages,
} from '@/lib/storage'
import { usedImageNames } from '@/lib/queries'

export const runtime = 'nodejs'

const SWEEP_INTERVAL = 60 * 60_000
let lastSweep = 0

/** Delete abandoned uploads at most once an hour, without blocking the request. */
function sweepInBackground() {
  const now = Date.now()
  if (now - lastSweep < SWEEP_INTERVAL) return
  lastSweep = now
  void sweepOrphanImages(usedImageNames()).catch(() => undefined)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`image:${user.id}:${clientIp(request)}`, 60, 60 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много загрузок картинок. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать файл' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Файл пустой' }, { status: 400 })
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Картинка больше 5 МБ' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = detectImageExtension(buffer)
  if (!ext) {
    return NextResponse.json(
      { error: 'Поддерживаются JPG, PNG и WebP' },
      { status: 415 },
    )
  }

  const name = await saveImageFile(buffer, ext)
  sweepInBackground()
  return NextResponse.json({ file: name })
}
