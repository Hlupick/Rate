import { randomUUID } from 'node:crypto'
import { clampAvatarFrame, type AvatarFrame } from './avatar-frame'
import { CHAT_MESSAGE_MAX, CHAT_PAGE_SIZE } from './chat-config'
import { db } from './db'
import { areFriends } from './social'

type Row = Record<string, any>

export type ChatMessage = {
  id: number
  body: string
  createdAt: number
  mine: boolean
}

export type ChatSummary = {
  chatId: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  lastMessage: string | null
  lastMessageAt: number
  lastMessageMine: boolean
  unread: number
}

export type ChatOther = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
}

export type ChatThread = {
  other: ChatOther
  messages: ChatMessage[]
  hasMore: boolean
}

function userByUsername(username: string): Row | undefined {
  return db
    .prepare(
      'SELECT id, username, display_name, avatar, avatar_frame, is_banned FROM users WHERE LOWER(username) = ?',
    )
    .get(username.trim().toLowerCase()) as Row | undefined
}

function mapOther(row: Row): ChatOther {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatar: row.avatar ? String(row.avatar) : null,
    avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
  }
}

function pairKey(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA]
}

function findChatId(userA: string, userB: string): string | null {
  const [a, b] = pairKey(userA, userB)
  const row = db
    .prepare('SELECT id FROM chats WHERE user_a = ? AND user_b = ?')
    .get(a, b) as Row | undefined
  return row ? String(row.id) : null
}

function cleanBody(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, CHAT_MESSAGE_MAX)
}

/** Conversations the viewer can see: only chats with current mutual friends. */
export function listChats(userId: string): ChatSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.last_message_at,
              cm.last_read_id,
              u.username, u.display_name, u.avatar, u.avatar_frame,
              m.body AS last_body, m.sender_id AS last_sender,
              (SELECT COUNT(*) FROM chat_messages x
               WHERE x.chat_id = c.id AND x.sender_id <> ? AND x.id > cm.last_read_id) AS unread
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ?
       JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       LEFT JOIN chat_messages m ON m.id =
         (SELECT id FROM chat_messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1)
       WHERE (c.user_a = ? OR c.user_b = ?)
         AND EXISTS (
           SELECT 1 FROM follows f1
           JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
           WHERE f1.follower_id = ? AND f1.following_id = u.id
         )
       ORDER BY c.last_message_at DESC`,
    )
    .all(userId, userId, userId, userId, userId, userId) as Row[]

  return rows.map((row) => ({
    chatId: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatar: row.avatar ? String(row.avatar) : null,
    avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
    lastMessage: row.last_body ? String(row.last_body) : null,
    lastMessageAt: Number(row.last_message_at ?? 0),
    lastMessageMine: String(row.last_sender ?? '') === userId,
    unread: Number(row.unread ?? 0),
  }))
}

export function getTotalUnread(userId: string): number {
  return listChats(userId).reduce((total, chat) => total + chat.unread, 0)
}

type ThreadOptions = {
  afterId?: number
  beforeId?: number
}

export type ChatThreadResult =
  | { ok: true; thread: ChatThread }
  | { ok: false; status: 403 | 404; error: string }

export function getChatThread(
  userId: string,
  otherUsername: string,
  options: ThreadOptions = {},
): ChatThreadResult {
  const other = userByUsername(otherUsername)
  if (!other || Number(other.is_banned ?? 0) === 1) {
    return { ok: false, status: 404, error: 'Пользователь не найден' }
  }
  const otherId = String(other.id)
  if (otherId === userId) return { ok: false, status: 404, error: 'Пользователь не найден' }
  if (!areFriends(userId, otherId)) {
    return { ok: false, status: 403, error: 'Переписка доступна только друзьям' }
  }

  const chatId = findChatId(userId, otherId)
  if (!chatId) {
    return { ok: true, thread: { other: mapOther(other), messages: [], hasMore: false } }
  }

  let rows: Row[]
  let hasMore = false

  if (options.afterId && options.afterId > 0) {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, created_at FROM chat_messages WHERE chat_id = ? AND id > ? ORDER BY id ASC LIMIT 100',
      )
      .all(chatId, Math.floor(options.afterId)) as Row[]
  } else if (options.beforeId && options.beforeId > 0) {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, created_at FROM chat_messages WHERE chat_id = ? AND id < ? ORDER BY id DESC LIMIT ?',
      )
      .all(chatId, Math.floor(options.beforeId), CHAT_PAGE_SIZE) as Row[]
    hasMore = rows.length === CHAT_PAGE_SIZE
    rows.reverse()
  } else {
    rows = db
      .prepare(
        'SELECT id, sender_id, body, created_at FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?',
      )
      .all(chatId, CHAT_PAGE_SIZE) as Row[]
    hasMore = rows.length === CHAT_PAGE_SIZE
    rows.reverse()
  }

  return {
    ok: true,
    thread: {
      other: mapOther(other),
      hasMore,
      messages: rows.map((row) => ({
        id: Number(row.id),
        body: String(row.body),
        createdAt: Number(row.created_at),
        mine: String(row.sender_id) === userId,
      })),
    },
  }
}

export type SendMessageResult =
  | { ok: true; message: ChatMessage; chatId: string }
  | { ok: false; status: 400 | 403 | 404; error: string }

export function sendChatMessage(
  userId: string,
  otherUsername: string,
  rawBody: string,
): SendMessageResult {
  const other = userByUsername(otherUsername)
  if (!other || Number(other.is_banned ?? 0) === 1) {
    return { ok: false, status: 404, error: 'Пользователь не найден' }
  }
  const otherId = String(other.id)
  if (otherId === userId) return { ok: false, status: 404, error: 'Пользователь не найден' }
  if (!areFriends(userId, otherId)) {
    return { ok: false, status: 403, error: 'Писать можно только друзьям' }
  }

  const body = cleanBody(rawBody)
  if (!body) return { ok: false, status: 400, error: 'Сообщение пустое' }

  const [a, b] = pairKey(userId, otherId)
  const now = Date.now()
  const chatId = randomUUID()

  db.exec('BEGIN IMMEDIATE')
  try {
    const chat = db
      .prepare(
        `INSERT INTO chats (id, user_a, user_b, created_at, last_message_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_a, user_b) DO UPDATE SET last_message_at = excluded.last_message_at
         RETURNING id`,
      )
      .get(chatId, a, b, now, now) as Row | undefined
    if (!chat) throw new Error('Chat was not created')

    const id = String(chat.id)
    db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(id, userId)
    db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(
      id,
      otherId,
    )

    const inserted = db
      .prepare(
        'INSERT INTO chat_messages (chat_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(id, userId, body, now)
    const messageId = Number(inserted.lastInsertRowid)

    db.exec('COMMIT')
    return {
      ok: true,
      chatId: id,
      message: { id: messageId, body, createdAt: now, mine: true },
    }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Marks everything in the conversation as read for this member. */
export function markChatRead(userId: string, otherUsername: string): number {
  const other = userByUsername(otherUsername)
  if (!other) return getTotalUnread(userId)
  const chatId = findChatId(userId, String(other.id))
  if (!chatId) return getTotalUnread(userId)

  const latest = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS id FROM chat_messages WHERE chat_id = ?')
    .get(chatId) as Row | undefined
  db.prepare(
    'UPDATE chat_members SET last_read_id = MAX(last_read_id, ?) WHERE chat_id = ? AND user_id = ?',
  ).run(Number(latest?.id ?? 0), chatId, userId)

  return getTotalUnread(userId)
}
