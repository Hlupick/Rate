import { cn } from '@/lib/utils'
import { resolveStatus, statusColorTheme } from '@/lib/status'

/** Status badge shown next to the display name. The boss variant has its own look. */
export function StatusPill({
  text,
  color,
  className,
}: {
  text: string
  color?: string | null
  className?: string
}) {
  const theme = statusColorTheme(color)
  const preset = resolveStatus(text)
  const label = preset?.label ?? text

  if (preset?.key === 'koto') {
    return (
      <span
        className={cn(
          'koto-pill inline-flex max-w-full items-center rounded-full py-1 pl-1 pr-3 text-[13px] font-extrabold',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/status/kotost.jpg"
          alt=""
          width={22}
          height={22}
          className="koto-cat shrink-0"
        />
        <span className="koto-text truncate">{label}</span>
      </span>
    )
  }

  if (preset?.key === 'boss') {
    return (
      <span
        className={cn(
          'boss-pill inline-flex max-w-full items-center justify-center rounded-full px-3.5 py-1 text-[13px] font-extrabold',
          className,
        )}
      >
        <svg className="boss-bolts" viewBox="0 0 160 34" preserveAspectRatio="none" aria-hidden="true">
          <path className="boss-bolt boss-bolt-1" d="M4 5 L10 11 L7 14 L13 20 L10 23 L15 29" />
          <path className="boss-bolt boss-bolt-2" d="M156 6 L150 12 L153 15 L147 21 L150 24 L144 29" />
          <path className="boss-bolt boss-bolt-3" d="M68 3 L74 8 L71 10 L77 16" />
        </svg>
        <span className="boss-text truncate">{label}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[13px] font-semibold tracking-normal text-ink/85 backdrop-blur-md',
        theme.pill,
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
