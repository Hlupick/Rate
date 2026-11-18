import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-base p-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[360, 520, 700, 900, 1100].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/[0.04]"
            style={{ width: size, height: size }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-white/[0.05] to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Logo size={34} />
          </Link>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-dim">
          Rate · музыка, которую добавляют слушатели
        </p>
      </div>
    </div>
  )
}
