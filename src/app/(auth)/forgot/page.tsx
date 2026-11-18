import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { isMailConfigured } from '@/lib/mail'
import { ForgotForm } from '@/components/auth/ForgotForm'

export const metadata: Metadata = { title: 'Восстановление пароля' }

export default async function ForgotPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')

  if (!isMailConfigured()) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6 shadow-2xl md:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Восстановление пароля</h1>
        <p className="mt-2 text-sm text-muted">
          Восстановление по почте пока не подключено. Напишите администратору — пароль поменяют
          вручную.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-white"
        >
          Вернуться ко входу
        </Link>
      </div>
    )
  }

  return <ForgotForm />
}
