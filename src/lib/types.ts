export type UserPublic = {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  avatar: string | null
  cover: string | null
  createdAt: number
  canUpload: boolean
  isAdmin: boolean
  isBanned: boolean
  sessionVersion: number
}

export type UserRecord = UserPublic & { passwordHash: string }

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
}

export type Playlist = {
  id: string
  name: string
  description: string | null
  ownerId: string
  isPublic: boolean
  createdAt: number
  trackCount: number
  missingCount: number
  cover: string | null
  avatar: string | null
  sourceUrl: string | null
  source: string | null
  ownerName: string
  ownerUsername: string
}

export type PlaylistDraft = {
  id: string
  playlistId: string
  position: number
  title: string
  artist: string
  createdAt: number
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
}
