/**
 * Repairs tracks that were saved with the uploader's name as the artist and
 * the whole "Artist - Title" string as the title. Values come from the file's
 * own tags, so nothing is guessed.
 *
 * Usage: node scripts/fix-track-tags.mjs [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { parseFile } from 'music-metadata'

const STORAGE = path.join(process.cwd(), 'storage')
const TRACKS_DIR = path.join(STORAGE, 'tracks')
const DB_FILE = path.join(STORAGE, 'monah.db')
const DRY_RUN = process.argv.includes('--dry-run')

if (!fs.existsSync(DB_FILE)) {
  console.error('Не найдена база storage/monah.db — запускайте скрипт из корня проекта.')
  process.exit(1)
}

const db = new DatabaseSync(DB_FILE)

function clean(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function searchText(title, artist, album) {
  return [title, artist, album ?? ''].join(' ').toLowerCase()
}

const rows = db.prepare('SELECT id, title, artist, album, file_name FROM tracks').all()
let changed = 0
let skipped = 0
let missing = 0
let failed = 0

for (const row of rows) {
  const file = path.join(TRACKS_DIR, String(row.file_name))
  if (!fs.existsSync(file)) {
    missing += 1
    continue
  }

  let common
  try {
    ;({ common } = await parseFile(file, { duration: false }))
  } catch {
    failed += 1
    continue
  }

  const tagTitle = clean(common.title).slice(0, 120)
  const tagArtist = clean(common.artist || common.artists?.join(', ')).slice(0, 80)
  const tagAlbum = clean(common.album).slice(0, 120) || null

  if (!tagTitle && !tagArtist) {
    skipped += 1
    continue
  }

  const title = tagTitle || String(row.title)
  const artist = tagArtist || String(row.artist)
  const album = tagAlbum ?? (row.album ? String(row.album) : null)

  if (title === row.title && artist === row.artist && album === (row.album ?? null)) {
    continue
  }

  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}${String(row.artist)} — ${String(row.title)}` +
      `  ->  ${artist} — ${title}${album ? ` (${album})` : ''}`,
  )

  if (!DRY_RUN) {
    db.prepare(
      'UPDATE tracks SET title = ?, artist = ?, album = ?, search_text = ? WHERE id = ?',
    ).run(title, artist, album, searchText(title, artist, album), String(row.id))
  }
  changed += 1
}

console.log('')
console.log(
  `${DRY_RUN ? 'Проверка' : 'Готово'}: проверено ${rows.length}, ` +
    `${DRY_RUN ? 'к обновлению' : 'обновлено'} ${changed}, без тегов ${skipped}, ` +
    `файлов не найдено ${missing}, ошибок чтения ${failed}.`,
)
if (DRY_RUN) console.log('Запустите без --dry-run, чтобы применить изменения.')
