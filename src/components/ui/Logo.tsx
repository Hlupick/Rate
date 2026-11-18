export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 text-ink">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeOpacity="0.35" />
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeOpacity="0.6" />
        <circle cx="16" cy="16" r="5.5" stroke="currentColor" strokeOpacity="0.85" />
        <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      </svg>
      <span className="text-[21px] font-extrabold leading-none tracking-[-0.04em]">Rate</span>
    </span>
  )
}
