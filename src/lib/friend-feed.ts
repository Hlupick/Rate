import { clampAvatarFrame, type AvatarFrame } from './avatar-frame'
import { db } from './db'

type Row = Record<string, any>

export type FriendActivityUser = {
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
}

export type FriendActivityItem =
  | {
      kind: 'track'
      id: string
      at: number
      user: FriendActivityUser
      title: string
      artist: string
    }
  | {
      kind: 'playlist'
      id: string
      at: number
      user: FriendActivityUser
      name: string
      trackCount: number
      avatar: string | null
      cover: string | null
    }

function activityUser(row: Row): FriendActivityUser {
  return {
    username: String(row.username),
    displayName: String(row.display_name),
    avatar: row.avatar ? String(row.avatar) : null,
    avatarFrame: clampAvatarFrame(row.avatar_frame ? String(row.avatar_frame) : null),
  }
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}

/** Approved uploads and public playlists made by mutual friends. */
export function getFriendActivity(userId: string, limit = 8): FriendActivityItem[] {
  const friends = db
    .prepare(
      `SELECT f.following_id AS id FROM follows f
       JOIN follows b ON b.follower_id = f.following_id AND b.following_id = f.follower_id
       WHERE f.follower_id = ?`,
    )
    .all(userId) as Row[]
  if (friends.length === 0) return []

  const friendIds = friends.map((row) => String(row.id))
  const marks = placeholders(friendIds.length)

  const tracks = db
    .prepare(
      `SELECT t.id, t.title, t.artist, t.created_at,
              u.username, u.display_name, u.avatar, u.avatar_frame
       FROM tracks t JOIN users u ON u.id = t.uploader_id
       WHERE t.uploader_id IN (${marks}) AND t.review_status = 'approved'
       ORDER BY t.created_at DESC LIMIT ?`,
    )
    .all(...friendIds, limit) as Row[]

  const playlists = db
    .prepare(
      `SELECT p.id, p.name, p.created_at, p.avatar, p.cover,
              u.username, u.display_name, u.avatar AS user_avatar, u.avatar_frame,
              (SELECT COUNT(*) FROM playlist_tracks pt
               JOIN tracks t ON t.id = pt.track_id
               WHERE pt.playlist_id = p.id AND t.review_status = 'approved') AS track_count
       FROM playlists p JOIN users u ON u.id = p.owner_id
       WHERE p.owner_id IN (${marks}) AND p.is_public = 1
       ORDER BY p.created_at DESC LIMIT ?`,
    )
    .all(...friendIds, limit) as Row[]

  const items: FriendActivityItem[] = [
    ...tracks.map((row) => ({
      kind: 'track' as const,
      id: String(row.id),
      at: Number(row.created_at),
      user: activityUser(row),
      title: String(row.title),
      artist: String(row.artist),
    })),
    ...playlists.map((row) => ({
      kind: 'playlist' as const,
      id: String(row.id),
      at: Number(row.created_at),
      user: activityUser({ ...row, avatar: row.user_avatar }),
      name: String(row.name),
      trackCount: Number(row.track_count ?? 0),
      avatar: row.avatar ? String(row.avatar) : null,
      cover: row.cover ? String(row.cover) : null,
    })),
  ]

  return items.sort((left, right) => right.at - left.at).slice(0, limit)
}
