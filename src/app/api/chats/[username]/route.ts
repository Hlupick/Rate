import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CHAT_MESSAGE_MAX } from '@/lib/chat-config'
import {
  getChatThread,
  getTotalUnread,
  sendChatMessage,
} from '@/lib/chat'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { username } = await params
  const url = new URL(request.url)
  const afterId = Number(url.searchParams.get('after') ?? 0) || 0
  const beforeId = Number(url.searchParams.get('before') ?? 0) || 0

  const result = getChatThread(user.id, decodeURIComponent(username), { afterId, beforeId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ...result.thread,
    unread: getTotalUnread(user.id),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`chat-send:${user.id}`, 30, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много сообщений. Подождите немного.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  const { username } = await params
  let body: { body?: string; attachment?: { type?: string; id?: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const text = typeof body.body === 'string' ? body.body : ''
  if (Array.from(text.trim()).length > CHAT_MESSAGE_MAX) {
    return NextResponse.json({ error: 'Сообщение слишком длинное' }, { status: 400 })
  }

  let attachment: { type: 'track' | 'playlist'; id: string } | undefined
  if (body.attachment) {
    const type = body.attachment.type
    const id = body.attachment.id
    if ((type !== 'track' && type !== 'playlist') || typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'Некорректное вложение' }, { status: 400 })
    }
    attachment = { type, id }
  }

  const result = sendChatMessage(user.id, decodeURIComponent(username), text, attachment)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    message: result.message,
    chatId: result.chatId,
    unread: getTotalUnread(user.id),
  })
}
