import { clampAvatarFrame, type AvatarFrame } from './avatar-frame'
import { db } from './db'
import { clampStatusColor, type StatusColor } from './status'

type Row = Record<string, any>

export type FollowRelation = 'self' | 'none' | 'following' | 'followed-by' | 'friends'

export type FollowStats = {
  followers: number
  following: number
  friends: number
}

export type ConnectionTab = 'friends' | 'followers' | 'following'

/** A person in a friends/followers list, without private account fields. */
export type ConnectionUser = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  status: string | null
  statusColor: StatusColor
  relation: FollowRelation
}

function targetByUsername(username: string): Row | undefined {
  return db
    .prepare('SELECT id, username, is_banned FROM users WHERE LOWER(username) = ?')
    .get(username.trim().toLowerCase()) as Row | undefined
}

function followingExists(followerId: string, followingId: string): boolean {
  return Boolean(
    db
      .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
      .get(followerId, followingId),
  )
}

export function getFollowRelation(
  viewerId: string | null | undefined,
  targetId: string,
): FollowRelation {
  if (!viewerId) return 'none'
  if (viewerId === targetId) return 'self'
  const outgoing = followingExists(viewerId, targetId)
  const incoming = followingExists(targetId, viewerId)
  if (outgoing && incoming) return 'friends'
  if (outgoing) return 'following'
  if (incoming) return 'followed-by'
  return 'none'
}

export function getFollowStats(userId: string): FollowStats {
  const followers = db
    .prepare('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?')
    .get(userId) as Row | undefined
  const following = db
    .prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?')
    .get(userId) as Row | undefined
  const friends = db
    .prepare(
      `SELECT COUNT(*) AS n FROM follows f
       JOIN follows b ON b.follower_id = f.following_id AND b.following_id = f.follower_id
       WHERE f.follower_id = ?`,
    )
    .get(userId) as Row | undefined
  return {
    followers: Number(followers?.n ?? 0),
    following: Number(following?.n ?? 0),
    friends: Number(friends?.n ?? 0),
  }
}

export function areFriends(userA: string, userB: string): boolean {
  if (userA === userB) return false
  return followingExists(userA, userB) && followingExists(userB, userA)
}

export type FollowResult =
  | { ok: true; relation: FollowRelation; stats: FollowStats }
  | { ok: false; status: 400 | 403 | 404; error: string }

export function setFollow(
  viewerId: string,
  targetUsername: string,
  follow: boolean,
): FollowResult {
  const target = targetByUsername(targetUsername)
  if (!target) return { ok: false, status: 404, error: 'Пользователь не найден' }
  const targetId = String(target.id)
  if (targetId === viewerId) {
    return { ok: false, status: 400, error: 'Нельзя подписаться на себя' }
  }
  if (Number(target.is_banned ?? 0) === 1) {
    return { ok: false, status: 403, error: 'Этот аккаунт заблокирован' }
  }

  if (follow) {
    db.prepare(
      'INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)',
    ).run(viewerId, targetId, Date.now())
  } else {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(
      viewerId,
      targetId,
    )
  }

  return {
    ok: true,
    relation: getFollowRelation(viewerId, targetId),
    stats: getFollowStats(targetId),
  }
}

/** Public list of friends, followers or following for one profile. */
export function listConnections(
  targetId: string,
  tab: ConnectionTab,
  viewerId: string | null,
  limit = 50,
  offset = 0,
): { items: ConnectionUser[]; total: number } {
  const size = Math.max(1, Math.min(Math.floor(limit), 100))
  const skip = Math.max(0, Math.floor(offset))
  const stats = getFollowStats(targetId)

  let rows: Row[]
  let total: number

  if (tab === 'followers') {
    total = stats.followers
    rows = db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.avatar_frame, u.status, u.status_color
         FROM follows f JOIN users u ON u.id = f.follower_id
         WHERE f.following_id = ? AND u.is_banned = 0
         ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(targetId, size, skip) as Row[]
  } else if (tab === 'friends') {
    total = stats.friends
    rows = db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.avatar_frame, u.status, u.status_color
         FROM follows f
         JOIN follows b ON b.follower_id = f.following_id AND b.following_id = f.follower_id
         JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = ? AND u.is_banned = 0
         ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(targetId, size, skip) as Row[]
  } else {
    total = stats.following
    rows = db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.avatar_frame, u.status, u.status_color
         FROM follows f JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = ? AND u.is_banned = 0
         ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(targetId, size, skip) as Row[]
  }

  return {
    total,
    items: rows.map((row) => ({
      id: String(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      avatar: row.avatar ? String(row.avatar) : null,
      avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
      status: row.status ? String(row.status) : null,
      statusColor: clampStatusColor(row.status_color ? String(row.status_color) : null),
      relation: getFollowRelation(viewerId, String(row.id)),
    })),
  }
}
