import 'server-only'
import { db } from './db'
import { formatDuration } from './format'
import { sendMail } from './mail'
import type { Track, UserPublic } from './types'

type Row = Record<string, any>

function siteUrl(): string {
  return (process.env.SITE_URL ?? 'https://ratemusic.space').replace(/\/+$/, '')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeText(value: unknown): string {
  return String(value ?? '')
}

function oneLine(value: unknown, max = 120): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Every active staff member, minus the person who triggered the notice. */
function recipientsExcluding(userId: string | null): string[] {
  const rows = db
    .prepare(
      `SELECT id, email FROM users
       WHERE is_banned = 0
         AND (is_admin = 1 OR role IN ('moderator', 'admin'))
         AND email IS NOT NULL AND email <> ''`,
    )
    .all() as Row[]

  const seen = new Set<string>()
  for (const row of rows) {
    if (String(row.id) === userId) continue
    const email = String(row.email).trim().toLowerCase()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      seen.add(email)
    }
  }
  return Array.from(seen)
}

function shell(heading: string, body: string, actions: { label: string; url: string }[]): string {
  const buttons = actions
    .map(
      (action) =>
        `<a href="${escapeHtml(action.url)}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 16px;border-radius:999px;background:#f3f3f3;color:#111;font-size:13px;font-weight:700;text-decoration:none">${escapeHtml(action.label)}</a>`,
    )
    .join('')

  return `<!doctype html>
<html lang="ru"><body style="margin:0;padding:24px;background:#111111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#181818;border:1px solid #2a2a2a;border-radius:16px;padding:26px 24px;color:#f2f2f2">
<div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#9a9a9a">Rate · модерация</div>
<div style="margin-top:14px;font-size:19px;font-weight:700">${escapeHtml(heading)}</div>
<div style="margin-top:14px;font-size:14px;line-height:1.6;color:#cfcfcf">${body}</div>
<div style="margin-top:22px">${buttons}</div>
</div>
</body></html>`
}

function rowsTable(rows: [string, string][]): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.5">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:3px 0;color:#8f8f8f;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:3px 0 3px 14px;color:#f2f2f2">${value}</td></tr>`,
    )
    .join('')}</table>`
}

async function deliver(subject: string, text: string, html: string, excludeUserId: string | null) {
  const recipients = recipientsExcluding(excludeUserId)
  if (recipients.length === 0) return
  await Promise.allSettled(
    recipients.map(async (to) => {
      const ok = await sendMail({ to, subject, text, html })
      if (!ok) console.error(`[moderation-mail] не удалось отправить письмо на ${to}`)
    }),
  )
}

export async function notifyPendingTrack(
  track: Pick<Track, 'id' | 'title' | 'artist' | 'duration'>,
  uploader: Pick<UserPublic, 'id' | 'displayName' | 'username'>,
): Promise<void> {
  try {
    const base = siteUrl()
    const trackUrl = `${base}/track/${track.id}`
    const moderationUrl = `${base}/moderation?tab=tracks&status=pending`
    const subject = `Rate: новый трек на проверке — «${oneLine(track.title)}»`
    const who = `${uploader.displayName} (@${uploader.username})`

    const text = [
      'Новый трек ждёт проверки.',
      '',
      `Название: ${track.title}`,
      `Исполнитель: ${track.artist}`,
      `Загрузил: ${who}`,
      `Длительность: ${formatDuration(track.duration)}`,
      '',
      `Модерация: ${moderationUrl}`,
      `Трек: ${trackUrl}`,
    ].join('\n')

    const html = shell(
      'Новый трек на проверке',
      rowsTable([
        ['Название', escapeHtml(track.title)],
        ['Исполнитель', escapeHtml(track.artist)],
        ['Загрузил', escapeHtml(who)],
        ['Длительность', escapeHtml(formatDuration(track.duration))],
      ]),
      [
        { label: 'Открыть модерацию', url: moderationUrl },
        { label: 'Открыть трек', url: trackUrl },
      ],
    )

    await deliver(subject, text, html, uploader.id)
  } catch (error) {
    console.error('[moderation-mail] трек: ошибка уведомления', error)
  }
}

export async function notifyNewReport(
  track: Pick<Track, 'id' | 'title' | 'artist'>,
  reporter: Pick<UserPublic, 'id' | 'displayName' | 'username'>,
  reason: string,
  comment: string | null,
): Promise<void> {
  try {
    const base = siteUrl()
    const trackUrl = `${base}/track/${track.id}`
    const reportsUrl = `${base}/moderation?tab=reports`
    const subject = `Rate: новая жалоба на трек — «${oneLine(track.title)}»`
    const who = `${reporter.displayName} (@${reporter.username})`
    const safeComment = comment ? escapeText(comment) : '—'

    const text = [
      'На трек пожаловались.',
      '',
      `Трек: ${track.title} — ${track.artist}`,
      `Причина: ${reason}`,
      `Комментарий: ${safeComment}`,
      `Пожаловался: ${who}`,
      '',
      `Жалобы: ${reportsUrl}`,
      `Трек: ${trackUrl}`,
    ].join('\n')

    const html = shell(
      'Новая жалоба',
      rowsTable([
        ['Трек', `${escapeHtml(track.title)} — ${escapeHtml(track.artist)}`],
        ['Причина', escapeHtml(reason)],
        [
          'Комментарий',
          escapeHtml(safeComment).replace(/\n/g, '<br>') || '—',
        ],
        ['Пожаловался', escapeHtml(who)],
      ]),
      [
        { label: 'Открыть жалобы', url: reportsUrl },
        { label: 'Открыть трек', url: trackUrl },
      ],
    )

    await deliver(subject, text, html, reporter.id)
  } catch (error) {
    console.error('[moderation-mail] жалоба: ошибка уведомления', error)
  }
}
