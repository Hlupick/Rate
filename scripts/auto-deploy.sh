#!/usr/bin/env bash
# Polls the production branch and rebuilds the app when it changes.
# Installed as a systemd timer on the server; safe to run manually.
set -euo pipefail

cd /root/monah

exec 9>/tmp/rate-auto-deploy.lock
flock -n 9 || exit 0

git fetch --prune origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

PREVIOUS="$(docker image inspect monah-app:latest --format '{{.Id}}' 2>/dev/null || true)"
if [ -n "$PREVIOUS" ]; then
  docker tag "$PREVIOUS" monah-app:previous
fi

git reset --hard "$REMOTE"
export APP_BUILD_ID="$(git rev-parse --short=12 HEAD)"
echo "$(date -Is) deploying $APP_BUILD_ID"

if ! docker compose build app; then
  echo "$(date -Is) build failed, keeping the running version"
  git reset --hard "$LOCAL"
  exit 1
fi

docker compose up -d
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --resolve ratemusic.space:443:127.0.0.1 \
    https://ratemusic.space/api/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo "$(date -Is) health check failed, rolling back"
  if docker image inspect monah-app:previous >/dev/null 2>&1; then
    docker tag monah-app:previous monah-app:latest
    docker compose up -d
  fi
  git reset --hard "$LOCAL"
  exit 1
fi

echo "$(date -Is) deployed $APP_BUILD_ID"
