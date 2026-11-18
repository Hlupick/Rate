import { cn } from '@/lib/utils'

/**
 * Artwork placeholder for a track: a black square with the track title in white.
 * Artists, playlists and profiles keep the monogram avatar.
 */
export function TrackAvatar({
  title,
  className,
  textClassName,
}: {
  title: string
  className?: string
  textClassName?: string
}) {
  return (
    <div
      title={title}
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-black p-1.5 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'line-clamp-2 break-words text-[9px] font-semibold leading-[1.15] text-white',
          textClassName,
        )}
      >
        {title}
      </span>
    </div>
  )
}
