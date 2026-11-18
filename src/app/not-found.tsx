import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-base px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
        <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-panel">
          <Logo size={38} />
        </div>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">404</div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Здесь ничего не играет</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Трек, плейлист или профиль не найдены — возможно, автор удалил загрузку.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
        >
          На главную
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-white/30 hover:text-ink"
        >
          К поиску
        </Link>
      </div>
    </div>
  )
}
