import type { MetadataRoute } from 'next'
import { getPublicPlaylists, listArtists, listTracks } from '@/lib/queries'

export const dynamic = 'force-dynamic'

const BASE = process.env.SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const tracks = listTracks({ limit: 500 })
  const playlists = getPublicPlaylists(100)
  const artists = listArtists(undefined, 100)

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE}/search`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/rules`,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    {
      url: `${BASE}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    ...tracks.map((track) => ({
      url: `${BASE}/track/${track.id}`,
      lastModified: new Date(track.createdAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...artists.map((artist) => ({
      url: `${BASE}/artist/${encodeURIComponent(artist.artist)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...playlists.map((playlist) => ({
      url: `${BASE}/playlist/${playlist.id}`,
      lastModified: new Date(playlist.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
  ]
}
