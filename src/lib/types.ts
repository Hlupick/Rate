import type { AvatarFrame } from './avatar-frame'
import type { StatusColor } from './status'

export type UserRole = 'user' | 'moderator' | 'admin'

export type UserPublic = {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  status: string | null
  statusColor: StatusColor
  avatar: string | null
  cover: string | null
  avatarFrame: AvatarFrame
  createdAt: number
  canUpload: boolean
  isAdmin: boolean
  isModerator: boolean
  role: UserRole
  isBanned: boolean
  sessionVersion: number
}

export type UserRecord = UserPublic & { passwordHash: string }

/** Public card used by search results; never includes email or account flags. */
export type UserSearchResult = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  avatarFrame: AvatarFrame
  status: string | null
  statusColor: StatusColor
}

export type Track = {
  id: string
  title: string
  artist: string
  album: string | null
  genre: string | null
  duration: number
  fileName: string
  mimeType: string
  size: number
  uploaderId: string
  playCount: number
  createdAt: number
  liked: boolean
  reviewStatus: 'pending' | 'approved' | 'rejected'
  reviewNote: string | null
}

export type Playlist = {
  id: string
  name: string
  description: string | null
  ownerId: string
  isPublic: boolean
  createdAt: number
  trackCount: number
  cover: string | null
  avatar: string | null
  ownerName: string
  ownerUsername: string
}

export type ArtistSummary = {
  artist: string
  trackCount: number
  playCount: number
}

export type Invite = {
  id: string
  code: string
  createdBy: string
  creatorName: string
  maxUses: number
  uses: number
  usedBy: string | null
  usedByName: string | null
  expiresAt: number | null
  createdAt: number
}

export type Report = {
  id: string
  trackId: string
  trackTitle: string
  trackArtist: string
  reporterId: string | null
  reporterName: string | null
  reason: string
  comment: string | null
  status: 'open' | 'resolved'
  createdAt: number
}

export type AdminUserRow = UserPublic & {
  uploads: number
  uploadBytes: number
  playlists: number
}
