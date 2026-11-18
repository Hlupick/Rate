import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = { title: 'Регистрация' }

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')
  return <AuthForm mode="register" />
}
