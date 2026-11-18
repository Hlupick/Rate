'use server'

import fsp from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TRACKS_DIR } from '@/lib/db'
import {
  createInvite,
  deleteInvite,
  deleteTrackAsAdmin,
  listAdminUsers,
  setReportStatus,
  setUserFlags,
  setUserRole,
} from '@/lib/queries'
import type { UserPublic, UserRole } from '@/lib/types'

async function requireAdmin(): Promise<UserPublic> {
  const user = await getCurrentUser()
  if (!user?.isAdmin) throw new Error('Нет доступа')
  return user
}

export async function createInviteAction(formData: FormData) {
  const admin = await requireAdmin()
  const maxUses = Number(formData.get('maxUses') ?? 1)
  const days = Number(formData.get('days') ?? 0)
  const invite = createInvite(
    admin.id,
    Number.isFinite(maxUses) ? maxUses : 1,
    Number.isFinite(days) ? days : 0,
  )
  revalidatePath('/admin')
  redirect(`/admin?invite=${invite.code}`)
}

export async function deleteInviteAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('inviteId') ?? '')
  if (id) deleteInvite(id)
  revalidatePath('/admin')
}

export async function setUserFlagAction(formData: FormData) {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const field = String(formData.get('field') ?? '')
  const value = String(formData.get('value') ?? '') === '1'
  if (!userId) return

  if (field === 'isAdmin' && !value) {
    const admins = listAdminUsers().filter((row) => row.isAdmin)
    // Never leave the site without an administrator (including self-demotion).
    if (admins.length <= 1) return
  }
  if (field === 'isBanned' && value && userId === admin.id) return

  if (field === 'canUpload' || field === 'isAdmin' || field === 'isBanned') {
    setUserFlags(userId, { [field]: value })
  }
  revalidatePath('/admin')
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  if (!userId || !['user', 'moderator', 'admin'].includes(role)) return

  const target = listAdminUsers().find((row) => row.id === userId)
  if (!target) return
  if (target.role === 'admin' && role !== 'admin') {
    const admins = listAdminUsers().filter((row) => row.role === 'admin')
    if (admins.length <= 1) return
  }
  if (target.id === admin.id && role !== 'admin') return

  setUserRole(userId, role)
  revalidatePath('/admin')
  revalidatePath('/moderation')
}

export async function deleteTrackAction(formData: FormData) {
  await requireAdmin()
  const trackId = String(formData.get('trackId') ?? '')
  if (!trackId) return
  const track = deleteTrackAsAdmin(trackId)
  if (track) {
    await fsp.unlink(path.join(TRACKS_DIR, track.fileName)).catch(() => undefined)
  }
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/library')
}

export async function setReportStatusAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('reportId') ?? '')
  const status = String(formData.get('status')) === 'resolved' ? 'resolved' : 'open'
  if (id) setReportStatus(id, status)
  revalidatePath('/admin')
}
