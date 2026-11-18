/**
 * Removes cover files that no profile or playlist references any more:
 * files left behind when an image picker was cancelled or a tab was closed
 * between upload and save.
 *
 * Usage: node scripts/cleanup-images.mjs [--dry-run] [--min-age-hours=24]
 */
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const STORAGE = path.join(process.cwd(), 'storage')
const COVERS_DIR = path.join(STORAGE, 'covers')
const DB_FILE = path.join(STORAGE, 'monah.db')
const DRY_RUN = process.argv.includes('--dry-run')
const ageArg = process.argv.find((value) => value.startsWith('--min-age-hours='))
const MIN_AGE_MS = Math.max(0, Number(ageArg?.split('=')[1] ?? 24)) * 60 * 60 * 1000

if (!fs.existsSync(DB_FILE)) {
  console.error('Не найдена база storage/monah.db — запускайте скрипт из корня проекта.')
  process.exit(1)
}

const db = new DatabaseSync(DB_FILE)

function referencedImages() {
  try {
    const rows = db
      .prepare(
        `SELECT avatar AS name FROM users WHERE avatar IS NOT NULL
         UNION ALL SELECT cover AS name FROM users WHERE cover IS NOT NULL
         UNION ALL SELECT avatar AS name FROM playlists WHERE avatar IS NOT NULL
         UNION ALL SELECT cover AS name FROM playlists WHERE cover IS NOT NULL`,
      )
      .all()
    return new Set(rows.map((row) => String(row.name)))
  } catch {
    return new Set()
  }
}

const keep = referencedImages()
const now = Date.now()
let removed = 0
let kept = 0

for (const file of fs.readdirSync(COVERS_DIR)) {
  const full = path.join(COVERS_DIR, file)
  const stat = fs.statSync(full)
  if (!stat.isFile()) continue

  if (keep.has(file) || now - stat.mtimeMs < MIN_AGE_MS) {
    kept += 1
    continue
  }

  if (DRY_RUN) {
    console.log(`[dry-run] удалить ${file}`)
  } else {
    fs.unlinkSync(full)
  }
  removed += 1
}

console.log('')
console.log(
  `${DRY_RUN ? 'Проверка' : 'Готово'}: файлов ${DRY_RUN ? 'к удалению' : 'удалено'} ${removed}, ` +
    `оставлено ${kept} (ссылок в базе: ${keep.size}).`,
)
if (DRY_RUN) console.log('Запустите без --dry-run, чтобы применить изменения.')
