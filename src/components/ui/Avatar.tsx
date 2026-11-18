import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Avatar({
  name,
  className,
  textClassName,
}: {
  name: string
  className?: string
  textClassName?: string
}) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4a4a4a] via-[#2a2a2a] to-[#141414] shadow-2xl',
        className,
      )}
    >
      <span className="absolute h-[150%] w-[150%] rounded-full border border-white/[0.05]" />
      <span className="absolute h-[104%] w-[104%] rounded-full border border-white/[0.07]" />
      <span className="absolute h-[64%] w-[64%] rounded-full border border-white/[0.09]" />
      <span className={cn('relative font-black tracking-tight text-white/80', textClassName)}>
        {initials(name)}
      </span>
    </div>
  )
}
