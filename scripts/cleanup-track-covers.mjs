/**
 * Removes artwork that used to be extracted from audio tags.
 * Playlist and profile images are kept: files still referenced by any
 * playlist or user are skipped.
 *
 * Usage: node scripts/cleanup-track-covers.mjs [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const STORAGE = path.join(process.cwd(), 'storage')
const COVERS_DIR = path.join(STORAGE, 'covers')
const DRY_RUN = process.argv.includes('--dry-run')
const SAFE_NAME = /^[a-zA-Z0-9._-]+$/

if (!fs.existsSync(path.join(STORAGE, 'monah.db'))) {
  console.error('Не найдена база storage/monah.db — запускайте скрипт из корня проекта.')
  process.exit(1)
}

const db = new DatabaseSync(path.join(STORAGE, 'monah.db'))

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
    // Older database without the new columns yet.
    return new Set()
  }
}

const referenced = referencedImages()
const tracks = db
  .prepare('SELECT id, cover FROM tracks WHERE cover IS NOT NULL')
  .all()

let deleted = 0
let cleared = 0
let skipped = 0

for (const track of tracks) {
  const name = String(track.cover)
  if (!SAFE_NAME.test(name) || referenced.has(name)) {
    skipped += 1
    continue
  }
  const file = path.join(COVERS_DIR, name)
  if (fs.existsSync(file)) {
    if (DRY_RUN) {
      console.log(`[dry-run] удалить ${name}`)
    } else {
      fs.unlinkSync(file)
    }
    deleted += 1
  }
  if (DRY_RUN) {
    console.log(`[dry-run] обнулить tracks.cover для ${track.id}`)
  } else {
    db.prepare('UPDATE tracks SET cover = NULL WHERE id = ?').run(track.id)
  }
  cleared += 1
}

console.log('')
console.log(
  `${DRY_RUN ? 'Проверка' : 'Готово'}: файлов ${DRY_RUN ? 'к удалению' : 'удалено'} ${deleted}, ` +
    `записей ${DRY_RUN ? 'к очистке' : 'очищено'} ${cleared}, пропущено ${skipped}.`,
)
if (DRY_RUN) console.log('Запустите без --dry-run, чтобы применить изменения.')
