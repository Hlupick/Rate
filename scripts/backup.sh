#!/usr/bin/env bash
# Daily backup: consistent SQLite snapshot + audio files, 7-day rotation.
# Usage: ./scripts/backup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

STAMP="$(date +%Y%m%d-%H%M%S)"

# VACUUM INTO gives a consistent copy even while the app is running.
docker compose exec -T app node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/app/storage/monah.db');
db.exec(\"VACUUM INTO '/app/storage/backup-${STAMP}.db'\");
"

tar -czf "backups/monah-${STAMP}.tar.gz" \
  -C storage "backup-${STAMP}.db" tracks covers

rm -f "storage/backup-${STAMP}.db"

find backups -name 'monah-*.tar.gz' -mtime +7 -delete

echo "Backup written: backups/monah-${STAMP}.tar.gz"
