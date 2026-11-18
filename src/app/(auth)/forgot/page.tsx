import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { ForgotForm } from '@/components/auth/ForgotForm'

export const metadata: Metadata = { title: 'Восстановление пароля' }

export default async function ForgotPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')
  return <ForgotForm />
}
