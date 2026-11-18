import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { SettingsForm } from '@/components/account/SettingsForm'

export const metadata: Metadata = { title: 'Настройки' }

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 md:px-6">
      <div className="pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Аккаунт
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Настройки</h1>
        <p className="mt-2 text-sm text-muted">
          @{user.username} · {user.email} ·{' '}
          <Link href={`/profile/${user.username}`} className="underline hover:text-ink">
            открыть профиль
          </Link>
        </p>
      </div>
      <div className="mt-6">
        <SettingsForm username={user.username} />
      </div>
    </div>
  )
}
