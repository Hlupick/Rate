import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export function SectionHeader({
  title,
  href,
  action = 'Показать все',
}: {
  title: string
  href?: string
  action?: string
}) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight md:text-[22px]">{title}</h2>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-ink"
        >
          {action}
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-2">
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      {description && <div className="mt-2 text-sm text-muted">{description}</div>}
      {children}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  href,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: string
  href?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card text-muted">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {action && href && (
        <Link
          href={href}
          className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
        >
          {action}
        </Link>
      )}
    </div>
  )
}
