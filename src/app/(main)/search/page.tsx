import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listArtists, listTracks, searchPlaylists } from '@/lib/queries'
import { SearchInput } from '@/components/search/SearchInput'
import { TracksPager } from '@/components/track/TracksPager'
import { ArtistCard, PlaylistCard } from '@/components/ui/cards'
import { CardGrid, SectionHeader } from '@/components/ui/Section'
import type { Metadata } from 'next'
import { tracksWord } from '@/lib/format'

export const metadata: Metadata = { title: 'Поиск' }

const GENRES = [
  { name: 'lo-fi', from: '#2c2c2c', to: '#111' },
  { name: 'ambient', from: '#2a3338', to: '#111' },
  { name: 'deep house', from: '#3a3126', to: '#131110' },
  { name: 'post-rock', from: '#2c3730', to: '#0f1210' },
  { name: 'dream pop', from: '#382e35', to: '#120f11' },
  { name: 'synthwave', from: '#2c2c44', to: '#0e0e14' },
  { name: 'neo-soul', from: '#3a322a', to: '#141210' },
  { name: 'downtempo', from: '#2a3636', to: '#0f1212' },
  { name: 'idm', from: '#313136', to: '#101012' },
  { name: 'piano house', from: '#2a343a', to: '#0f1214' },
]

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string }>
}) {
  const { q, genre } = await searchParams
  const user = await getCurrentUser()
  const viewerId = user?.id ?? null
  const query = (q ?? '').trim()

  const PAGE = 50
  const popularPage = !genre && !query ? listTracks({ limit: PAGE + 1, viewerId, sort: 'popular' }) : []
  const foundPage = genre
    ? listTracks({ genre, limit: PAGE + 1, viewerId, sort: 'popular' })
    : query
      ? listTracks({ q: query, limit: PAGE + 1, viewerId })
      : []
  const tracks = foundPage.slice(0, PAGE)
  const tracksHasMore = foundPage.length > PAGE
  const popular = popularPage.slice(0, PAGE)
  const artists = query ? listArtists(query, 6) : []
  const playlists = query ? searchPlaylists(query, 6) : []

  const hasQuery = Boolean(query || genre)
  const nothingFound = hasQuery && tracks.length === 0 && artists.length === 0 && playlists.length === 0

  return (
    <div className="px-4 md:px-6">
      <div className="pt-2">
        <SearchInput />
      </div>

      {!hasQuery && (
        <>
          <SectionHeader title="Обзор жанров" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {GENRES.map((item) => (
              <Link
                key={item.name}
                href={`/search?genre=${encodeURIComponent(item.name)}`}
                className="group relative flex h-24 items-end overflow-hidden rounded-lg p-4 transition hover:brightness-125"
                style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
              >
                <span className="relative z-10 text-[15px] font-bold capitalize tracking-tight">
                  {item.name}
                </span>
                <span className="absolute -right-2 -top-3 h-16 w-16 rounded-full border border-white/10 transition group-hover:scale-110" />
                <span className="absolute -right-6 top-6 h-16 w-16 rounded-full border border-white/5" />
              </Link>
            ))}
          </div>

          <SectionHeader title="Все треки" />
          <TracksPager
            initialTracks={popular}
            initialHasMore={popularPage.length > PAGE}
            params={{ sort: 'popular' }}
            viewerId={viewerId}
            label="Все треки"
            showAlbum
          />
        </>
      )}

      {genre && (
        <>
          <div className="mt-6 mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Жанр
            </div>
            <h1 className="mt-1 text-3xl font-extrabold capitalize tracking-tight">{genre}</h1>
            <p className="mt-1 text-sm text-muted">
              {tracksWord(tracks.length)}
              {tracksHasMore ? '+' : ''}
            </p>
          </div>
          <TracksPager
            initialTracks={tracks}
            initialHasMore={tracksHasMore}
            params={{ genre, sort: 'popular' }}
            viewerId={viewerId}
            label={genre}
          />
        </>
      )}

      {query && (
        <>
          <div className="mt-6 mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Результаты поиска
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">«{query}»</h1>
          </div>

          {nothingFound && (
            <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-16 text-center">
              <SearchX size={28} className="mb-4 text-muted" />
              <h2 className="text-lg font-semibold">Ничего не нашлось</h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                Попробуйте другое название, исполнителя или жанр. Или загрузите этот трек сами.
              </p>
            </div>
          )}

          {tracks.length > 0 && (
            <>
              <SectionHeader title="Треки" />
              <TracksPager
                initialTracks={tracks}
                initialHasMore={tracksHasMore}
                params={{ q: query }}
                viewerId={viewerId}
                label={`Поиск: ${query}`}
              />
            </>
          )}

          {artists.length > 0 && (
            <>
              <SectionHeader title="Исполнители" />
              <CardGrid>
                {artists.map((artist) => (
                  <ArtistCard
                    key={artist.artist}
                    artist={artist.artist}
                    trackCount={artist.trackCount}
                  />
                ))}
              </CardGrid>
            </>
          )}

          {playlists.length > 0 && (
            <>
              <SectionHeader title="Плейлисты" />
              <CardGrid>
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </CardGrid>
            </>
          )}
        </>
      )}
    </div>
  )
}
