import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BadgeCheck } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listArtists, listTracks } from '@/lib/queries'
import { PlayAllButton } from '@/components/track/Actions'
import { TrackList } from '@/components/track/TrackList'
import { ArtistCard } from '@/components/ui/cards'
import { CardGrid, SectionHeader } from '@/components/ui/Section'
import { Avatar } from '@/components/ui/Avatar'
import { formatCount, formatTotalDuration, tracksWord } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  return { title: decodeURIComponent(name) }
}

export default async function ArtistPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const artist = decodeURIComponent(name)
  const user = await getCurrentUser()
  const tracks = listTracks({ artist, viewerId: user?.id, sort: 'popular', limit: 200 })

  if (tracks.length === 0) notFound()

  const totalPlays = tracks.reduce((acc, track) => acc + track.playCount, 0)
  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0)
  const otherArtists = listArtists(undefined, 8)
    .filter((item) => item.artist !== artist)
    .slice(0, 5)

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent" />
        <div className="relative flex flex-col items-center gap-6 px-4 pb-6 pt-10 text-center md:flex-row md:items-end md:px-6 md:pt-14 md:text-left">
          <Avatar
            name={artist}
            className="h-40 w-40 md:h-52 md:w-52"
            textClassName="text-6xl md:text-7xl"
          />
          <div className="w-full min-w-0 md:flex-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted md:justify-start">
              <BadgeCheck size={14} /> Исполнитель
            </div>
            <h1 className="mt-2 break-words text-4xl font-extrabold leading-none tracking-tight md:text-5xl xl:text-6xl">
              {artist}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {tracksWord(tracks.length)} · {formatTotalDuration(totalDuration)} ·{' '}
              {formatCount(totalPlays)} прослушиваний
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6">
        <div className="flex items-center justify-center gap-4 py-2 md:justify-start">
          <PlayAllButton tracks={tracks} label={artist} />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Популярные треки</h2>
          <TrackList tracks={tracks} viewerId={user?.id ?? null} label={artist} showAlbum />
        </div>

        {otherArtists.length > 0 && (
          <>
            <SectionHeader title="Другие исполнители" />
            <CardGrid>
              {otherArtists.map((item) => (
                <ArtistCard
                  key={item.artist}
                  artist={item.artist}
                  trackCount={item.trackCount}
                />
              ))}
            </CardGrid>
          </>
        )}

        <p className="mt-10 text-xs text-dim">
          Все треки исполнителя добавлены слушателями monah.{' '}
          <Link href="/search" className="underline hover:text-muted">
            Найти похожее
          </Link>
        </p>
      </div>
    </div>
  )
}
