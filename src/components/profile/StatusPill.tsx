import { cn } from '@/lib/utils'
import { statusColorTheme } from '@/lib/status'

/** Speech-bubble badge: a short status shown next to the display name. */
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
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[13px] font-semibold tracking-normal text-ink/85 backdrop-blur-md',
        theme.pill,
        className,
      )}
    >
      <svg
        width="18"
        height="13"
        viewBox="0 0 20 14"
        fill="currentColor"
        aria-hidden
        className={cn('shrink-0', theme.icon)}
      >
        <path d="M4 0h12a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4H9l-4.5 3 1-3H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Z" />
      </svg>
      <span className="truncate">{text}</span>
    </span>
  )
}
