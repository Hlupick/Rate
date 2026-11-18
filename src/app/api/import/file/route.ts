import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ImportFileError, parseImportFile } from '@/lib/import-file'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`import-file:${user.id}`, 20, 60 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много импортов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать файл' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 })
  }

  try {
    const parsed = parseImportFile(file.name, Buffer.from(await file.arrayBuffer()))
    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof ImportFileError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[import] file parse failed:', error)
    return NextResponse.json({ error: 'Не удалось разобрать файл' }, { status: 500 })
  }
}
