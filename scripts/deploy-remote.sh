#!/usr/bin/env bash

set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-240}"

log() {
  printf '[deploy-remote] %s\n' "$1"
}

fetch_url() {
  local url="$1"

  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$url"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO- "$url"
    return
  fi

  node -e "fetch(process.argv[1]).then(async (res) => { if (!res.ok) process.exit(1); process.stdout.write(await res.text()); }).catch(() => process.exit(1));" "$url"
}

wait_for_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local health_url="${APP_URL%/}/api/health"

  log "waiting for health endpoint: ${health_url}"

  while (( SECONDS < deadline )); do
    if fetch_url "$health_url" >/tmp/song-to-lyrics-health.json 2>/dev/null; then
      log "health check passed"
      cat /tmp/song-to-lyrics-health.json
      printf '\n'
      rm -f /tmp/song-to-lyrics-health.json
      return 0
    fi

    sleep 5
  done

  log "health check failed before timeout"
  return 1
}

deploy_with_docker_compose() {
  log "detected docker compose deployment"
  docker compose up -d --build --remove-orphans
}

deploy_with_pm2() {
  log "detected pm2 deployment"
  npm ci --omit=dev
  if pm2 describe song-to-lyrics >/dev/null 2>&1; then
    pm2 restart song-to-lyrics --update-env
  else
    pm2 start npm --name song-to-lyrics -- start
  fi
}

deploy_with_systemd() {
  log "detected systemd deployment"
  npm ci --omit=dev
  sudo systemctl restart song-to-lyrics
}

deploy_with_plain_node() {
  log "detected plain node deployment"
  npm ci --omit=dev
  pkill -f "node src/server.js" >/dev/null 2>&1 || true
  nohup npm start > server.log 2>server-error.log &
}

if [[ ! -f package.json ]]; then
  log "package.json was not found in $(pwd)"
  exit 1
fi

log "deploying branch ${DEPLOY_BRANCH} from $(pwd)"

if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  deploy_with_docker_compose
elif command -v pm2 >/dev/null 2>&1; then
  deploy_with_pm2
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^song-to-lyrics'; then
  deploy_with_systemd
else
  deploy_with_plain_node
fi

wait_for_health

