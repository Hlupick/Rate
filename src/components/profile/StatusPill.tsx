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
        'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[13px] font-semibold tracking-normal text-ink/85 backdrop-blur-md',
        theme.pill,
        className,
      )}
    >
      <span className="truncate">{text}</span>
    </span>
  )
}
