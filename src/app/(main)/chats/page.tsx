import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { ChatApp } from '@/components/chat/ChatApp'

export const metadata: Metadata = { title: 'Сообщения' }

export default async function ChatsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <ChatApp viewer={{ username: user.username, displayName: user.displayName }} />
}
