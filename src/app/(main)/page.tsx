import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getPublicPlaylists, libraryStats, listArtists, listTracks, recentlyPlayed } from '@/lib/queries'
import { CardGrid, SectionHeader } from '@/components/ui/Section'
import { TrackCard } from '@/components/track/TrackCard'
import { RecentGrid } from '@/components/home/RecentGrid'
import { ArtistCard, PlaylistCard } from '@/components/ui/cards'
import { Logo } from '@/components/ui/Logo'
import { StreakChip } from '@/components/streak/StreakChip'
import { tracksWord } from '@/lib/format'

export default async function HomePage() {
  const user = await getCurrentUser()
  const viewerId = user?.id ?? null

  const recent = user ? recentlyPlayed(user.id, 6) : []
  const fresh = listTracks({ sort: 'new', limit: 10, viewerId })
  const popular = listTracks({ sort: 'popular', limit: 10, viewerId })
  const playlists = getPublicPlaylists(6)
  const artists = listArtists(undefined, 5)
  const totals = libraryStats(viewerId ?? '')

  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="relative px-4 pb-8 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/[0.055] to-transparent" />

      <div className="relative">
        <div className="flex items-end justify-between gap-4 pt-3">
          <h1 className="flex flex-wrap items-center gap-2 text-[26px] font-extrabold tracking-tight md:text-[32px]">
            <span>
              {greeting}
              {user ? `, ${user.displayName}` : ''}
            </span>
            {user && <StreakChip username={user.username} />}
          </h1>
          <div className="hidden items-center gap-2 text-xs text-dim sm:flex">
            <Logo size={18} />
            <span>{tracksWord(totals.tracks)} в библиотеке</span>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="mt-5">
            <RecentGrid tracks={recent} label="Недавно слушали" />
          </div>
        ) : !user ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#222] via-[#171717] to-[#101010] p-6 md:p-8">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Добро пожаловать
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                Музыка, которую добавляют сами слушатели
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                Загружайте свои треки, собирайте плейлисты и слушайте то, что принесли другие.
                Никаких редакций и алгоритмов — только люди.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/register"
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
                >
                  Создать аккаунт
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink"
                >
                  У меня уже есть аккаунт
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-line p-5 text-sm text-muted">
            Вы ещё ничего не слушали. Начните с «Новых загрузок» — или загрузите свой первый трек.
          </div>
        )}

        <SectionHeader title="Новые загрузки" href="/search" action="Все треки" />
        <CardGrid>
          {fresh.map((track) => (
            <TrackCard key={track.id} track={track} list={fresh} label="Новые загрузки" />
          ))}
        </CardGrid>

        <SectionHeader title="Популярное сейчас" />
        <CardGrid>
          {popular.map((track) => (
            <TrackCard key={track.id} track={track} list={popular} label="Популярное" />
          ))}
        </CardGrid>

        {playlists.length > 0 && (
          <>
            <SectionHeader title="Плейлисты сообщества" />
            <CardGrid>
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </CardGrid>
          </>
        )}

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

        <div className="mt-14 flex flex-col gap-1 border-t border-white/5 pt-6 text-xs text-dim">
          <div className="flex items-center gap-2">
            <Logo size={16} />
            <span>Локальный проект. Треки добавляют сами слушатели.</span>
          </div>
          <span>Демо-аккаунт: demo@monah.local / monah123</span>
        </div>

        <div className="mt-5">
          <Link
            href="/rules"
            className="inline-flex rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
          >
            Правила сайта
          </Link>
        </div>
      </div>
    </div>
  )
}
