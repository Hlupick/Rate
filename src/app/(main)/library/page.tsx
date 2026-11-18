import Link from 'next/link'
import { Heart, Library, Music4, Upload } from 'lucide-react'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getPlaylistsByOwner, libraryStats, listTracks } from '@/lib/queries'
import { CardGrid, EmptyState, SectionHeader } from '@/components/ui/Section'
import { PlaylistCard } from '@/components/ui/cards'
import { TracksPager } from '@/components/track/TracksPager'
import { CreatePlaylistButton } from '@/components/playlist/CreatePlaylistButton'
import { artistsWord, tracksWord } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Моя медиатека' }

const TABS = [
  { key: 'playlists', label: 'Плейлисты' },
  { key: 'likes', label: 'Мне нравится' },
  { key: 'uploads', label: 'Мои загрузки' },
] as const

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const active = tab === 'likes' || tab === 'uploads' ? tab : 'playlists'
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Моя медиатека</h1>
        <p className="mt-2 text-sm text-muted">
          Здесь будут ваши плейлисты, лайки и загруженные треки.
        </p>
        <div className="mt-8">
          <EmptyState
            icon={<Library size={24} />}
            title="Войдите в аккаунт"
            description="Плейлисты, лайки и загрузки привязаны к профилю. Создайте аккаунт за минуту — или войдите в демо."
            action="Войти"
            href="/login"
          />
        </div>
      </div>
    )
  }

  const stats = libraryStats(user.id)
  const playlists = getPlaylistsByOwner(user.id)
  const PAGE = 50
  const likedPage = listTracks({ likedBy: user.id, viewerId: user.id, limit: PAGE + 1 })
  const uploadsPage = listTracks({
    uploaderId: user.id,
    viewerId: user.id,
    reviewStatus: 'all',
    limit: PAGE + 1,
  })
  const liked = likedPage.slice(0, PAGE)
  const uploads = uploadsPage.slice(0, PAGE)

  return (
    <div className="px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Коллекция
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Моя медиатека</h1>
          <p className="mt-2 text-sm text-muted">
            {tracksWord(stats.tracks)} в библиотеке · {artistsWord(stats.artists)} · ваших
            загрузок: {stats.uploads}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreatePlaylistButton />
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-white/5">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/library?tab=${item.key}`}
            className={cn(
              'relative px-3 py-2.5 text-sm font-medium transition',
              active === item.key ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
            {active === item.key && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        {active === 'playlists' && (
          <>
            {playlists.length === 0 ? (
              <EmptyState
                icon={<Music4 size={24} />}
                title="Плейлистов пока нет"
                description="Соберите первый плейлист: добавьте треки из библиотеки через меню «…» рядом с треком."
              />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Ваши плейлисты</h2>
                  <span className="text-xs text-muted">{playlists.length}</span>
                </div>
                <CardGrid>
                  <Link
                    href="/library?tab=likes"
                    className="group rounded-lg bg-card p-3 transition hover:bg-card-hover"
                  >
                    <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-md bg-gradient-to-br from-[#3d3d3d] to-[#1c1c1c] shadow-lg">
                      <Heart size={40} className="text-ink/80" />
                    </div>
                    <div className="truncate text-[14px] font-semibold">Мне нравится</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">{tracksWord(stats.likes)}</div>
                  </Link>
                  {playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </CardGrid>
              </>
            )}
          </>
        )}

        {active === 'likes' && (
          <>
            {likedPage.length === 0 ? (
              <EmptyState
                icon={<Heart size={24} />}
                title="Пока пусто"
                description="Ставьте лайки трекам — они появятся здесь и будут в вашей личной коллекции."
                action="Найти музыку"
                href="/"
              />
            ) : (
              <TracksPager
                initialTracks={liked}
                initialHasMore={likedPage.length > PAGE}
                params={{ scope: 'likes' }}
                viewerId={user.id}
                label="Мне нравится"
              />
            )}
          </>
        )}

        {active === 'uploads' && (
          <>
            {uploadsPage.length === 0 ? (
              <EmptyState
                icon={<Upload size={24} />}
                title="Вы ещё ничего не загружали"
                description="Добавьте первый трек — он сразу появится в общей библиотеке и станет доступен всем."
                action="Загрузить трек"
                href="/upload"
              />
            ) : (
              <>
                <SectionHeader title={`Ваши треки · ${stats.uploads}`} />
                <TracksPager
                  initialTracks={uploads}
                  initialHasMore={uploadsPage.length > PAGE}
                  params={{ scope: 'uploads' }}
                  viewerId={user.id}
                  label="Мои загрузки"
                  showDate
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
