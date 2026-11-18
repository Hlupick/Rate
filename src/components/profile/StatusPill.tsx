import { cn } from '@/lib/utils'

/** Speech-bubble badge: a short status shown next to the display name. */
export function StatusPill({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[13px] font-semibold tracking-normal text-ink/85 backdrop-blur-md',
        className,
      )}
    >
      <svg
        width="18"
        height="13"
        viewBox="0 0 20 14"
        fill="currentColor"
        aria-hidden
        className="shrink-0 text-white/65"
      >
        <path d="M4 0h12a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4H9l-4.5 3 1-3H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Z" />
      </svg>
      <span className="truncate">{text}</span>
    </span>
  )
}
