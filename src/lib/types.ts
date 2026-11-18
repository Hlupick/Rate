export type UserPublic = {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  createdAt: number
  canUpload: boolean
  isAdmin: boolean
  isBanned: boolean
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
  cover: string | null
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
  cover: string | null
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
