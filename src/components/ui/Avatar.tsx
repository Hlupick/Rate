'use client'

import { useEffect, useState } from 'react'
import { coverUrl, fallbackGradient, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Avatar({
  name,
  src,
  shape = 'circle',
  className,
  textClassName,
}: {
  name: string
  src?: string | null
  shape?: 'circle' | 'square'
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const url = coverUrl(src)

  useEffect(() => {
    setFailed(false)
  }, [url])

  const showImage = Boolean(url) && !failed

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#4a4a4a] via-[#2a2a2a] to-[#141414] shadow-2xl',
        shape === 'square' ? 'rounded-md' : 'rounded-full',
        className,
      )}
      style={showImage ? undefined : { background: fallbackGradient(name) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          {shape === 'circle' && (
            <>
              <span className="absolute h-[150%] w-[150%] rounded-full border border-white/[0.05]" />
              <span className="absolute h-[104%] w-[104%] rounded-full border border-white/[0.07]" />
              <span className="absolute h-[64%] w-[64%] rounded-full border border-white/[0.09]" />
            </>
          )}
          <span className={cn('relative font-black tracking-tight text-white/80', textClassName)}>
            {initials(name)}
          </span>
        </>
      )}
    </div>
  )
}
