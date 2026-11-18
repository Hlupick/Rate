import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { isMailConfigured } from '@/lib/mail'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = { title: 'Вход' }

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')
  return <AuthForm mode="login" canResetPassword={isMailConfigured()} />
}
