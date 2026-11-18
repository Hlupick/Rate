#!/usr/bin/env bash
# Pull the latest code and rebuild the app container.
# Usage: ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

git pull --ff-only

docker compose build app
docker compose up -d --remove-orphans
docker image prune -f

if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	. ./.env
	set +a
fi

if [ -n "${DOMAIN:-}" ]; then
	sleep 5
	curl -fsS "https://${DOMAIN}/api/health" && echo
fi
