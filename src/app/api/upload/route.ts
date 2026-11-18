import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { parseBuffer } from 'music-metadata'
import { getCurrentUser } from '@/lib/auth'
import { TRACKS_DIR } from '@/lib/db'
import { createTrack, userUploadStats } from '@/lib/queries'
import { QUOTAS, diskFreeBytes, formatBytes } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'
import { splitFileName, tagValue } from '@/lib/track-names'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_SIZE = 50 * 1024 * 1024

type Detected = { ext: string; mime: string }

function detectFormat(buffer: Buffer, originalName: string): Detected | null {
  if (buffer.length < 12) return null
  const head = buffer.toString('ascii', 0, 4)
  const brand = buffer.toString('ascii', 4, 8)
  if (head === 'fLaC') return { ext: 'flac', mime: 'audio/flac' }
  if (head === 'OggS') return { ext: 'ogg', mime: 'audio/ogg' }
  if (head === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return { ext: 'wav', mime: 'audio/wav' }
  }
  if (brand === 'ftyp') return { ext: 'm4a', mime: 'audio/mp4' }
  if (buffer.toString('ascii', 0, 3) === 'ID3') return { ext: 'mp3', mime: 'audio/mpeg' }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    const isAac = originalName.toLowerCase().endsWith('.aac')
    return isAac ? { ext: 'aac', mime: 'audio/aac' } : { ext: 'mp3', mime: 'audio/mpeg' }
  }
  return null
}

function limit(value: FormDataEntryValue | null, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`upload:${user.id}`, QUOTAS.tracksPerUser + 20, 60 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: `Слишком много загрузок. Повторите через ${Math.ceil(limiter.retryAfter / 60)} мин.` },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  if (!user.canUpload && !user.isAdmin) {
    return NextResponse.json(
      { error: 'Загрузка доступна по инвайт-коду. Активируйте его на странице загрузки.' },
      { status: 403 },
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
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Файл больше 50 МБ (${(file.size / 1024 / 1024).toFixed(1)} МБ)` },
      { status: 413 },
    )
  }

  const stats = userUploadStats(user.id)
  if (stats.count >= QUOTAS.tracksPerUser) {
    return NextResponse.json(
      { error: `Достигнут лимит: ${QUOTAS.tracksPerUser} треков на пользователя` },
      { status: 403 },
    )
  }
  if (stats.bytes + file.size > QUOTAS.bytesPerUser) {
    return NextResponse.json(
      {
        error: `Достигнут лимит места на пользователя (${formatBytes(QUOTAS.bytesPerUser)}). Удалите старые загрузки.`,
      },
      { status: 413 },
    )
  }

  const free = await diskFreeBytes()
  if (free - file.size < QUOTAS.minFreeBytes) {
    return NextResponse.json(
      { error: 'На сервере заканчивается место, загрузка временно приостановлена' },
      { status: 507 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = detectFormat(buffer, file.name)
  if (!detected) {
    return NextResponse.json(
      { error: 'Формат не поддерживается или файл повреждён' },
      { status: 415 },
    )
  }

  let metadata: Awaited<ReturnType<typeof parseBuffer>> | null = null
  try {
    metadata = await parseBuffer(
      buffer,
      { mimeType: detected.mime, size: buffer.length },
      { duration: true },
    )
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать аудиофайл' }, { status: 415 })
  }

  const parsed = splitFileName(file.name)
  const tagArtist =
    tagValue(metadata.common.artist) || tagValue(metadata.common.artists?.join(', '))

  const title =
    limit(form.get('title'), 120) || tagValue(metadata.common.title) || parsed.title || 'Без названия'
  const artist =
    limit(form.get('artist'), 80) || tagArtist.slice(0, 80) || parsed.artist || user.displayName
  const album = limit(form.get('album'), 120) || tagValue(metadata.common.album) || null
  const genre = metadata.common.genre?.[0]?.slice(0, 40) ?? null
  const duration = metadata.format.duration ?? 0

  const fileName = `${randomUUID()}.${detected.ext}`
  await fs.writeFile(path.join(TRACKS_DIR, fileName), buffer)

  const track = createTrack({
    title,
    artist: artist || user.displayName,
    album: album || null,
    genre,
    duration,
    fileName,
    mimeType: detected.mime,
    size: buffer.length,
    uploaderId: user.id,
  })

  return NextResponse.json({ track })
}
