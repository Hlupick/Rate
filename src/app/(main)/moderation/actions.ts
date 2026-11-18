'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import {
  listAdminUsers,
  reviewTrack,
  setReportStatus,
  setUserFlags,
} from '@/lib/queries'
import type { UserPublic } from '@/lib/types'

async function requireModerator(): Promise<UserPublic> {
  const user = await getCurrentUser()
  if (!user?.isModerator) throw new Error('Нет доступа')
  return user
}

export async function reviewTrackAction(formData: FormData) {
  const moderator = await requireModerator()
  const trackId = String(formData.get('trackId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  if (!trackId || (decision !== 'approved' && decision !== 'rejected')) return

  reviewTrack(
    trackId,
    decision,
    moderator.id,
    decision === 'rejected' ? note || 'Без объяснения' : null,
  )
  revalidatePath('/moderation')
  revalidatePath('/')
  revalidatePath('/library')
  revalidatePath('/search')
  revalidatePath(`/track/${trackId}`)
}

export async function moderationBanAction(formData: FormData) {
  const moderator = await requireModerator()
  const userId = String(formData.get('userId') ?? '')
  const banned = String(formData.get('banned') ?? '') === '1'
  if (!userId || userId === moderator.id) return

  const target = listAdminUsers().find((row) => row.id === userId)
  if (!target || target.role !== 'user') return

  setUserFlags(userId, { isBanned: banned })
  revalidatePath('/moderation')
  revalidatePath('/admin')
}

export async function moderationReportAction(formData: FormData) {
  await requireModerator()
  const reportId = String(formData.get('reportId') ?? '')
  const status = String(formData.get('status')) === 'resolved' ? 'resolved' : 'open'
  if (reportId) setReportStatus(reportId, status)
  revalidatePath('/moderation')
  revalidatePath('/admin')
}
