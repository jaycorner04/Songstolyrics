#!/usr/bin/env bash

set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-240}"
BUILD_MARKER="${BUILD_MARKER:-}"
APP_NETWORK="${APP_NETWORK:-song-to-lyrics-net}"
BGUTIL_PROVIDER_IMAGE="${BGUTIL_PROVIDER_IMAGE:-brainicism/bgutil-ytdlp-pot-provider}"

log() {
  printf '[deploy-remote] %s\n' "$1"
}

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
    return
  fi

  sudo -n docker "$@"
}

docker_compose_available() {
  docker_cmd compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1
}

run_docker_compose() {
  if docker_cmd compose version >/dev/null 2>&1; then
    docker_cmd compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  sudo -n docker-compose "$@"
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

wait_for_build_marker() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local expected_marker="$1"
  local homepage_url="${APP_URL%/}/"

  log "waiting for homepage build marker: ${expected_marker}"

  while (( SECONDS < deadline )); do
    local page
    page="$(fetch_url "$homepage_url" 2>/dev/null || true)"

    if [[ "$page" == *"$expected_marker"* ]]; then
      log "homepage build marker matched"
      return 0
    fi

    sleep 5
  done

  log "homepage build marker did not match before timeout"
  return 1
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
  run_docker_compose up -d --build --remove-orphans
}

docker_container_available() {
  docker_cmd inspect song-to-lyrics >/dev/null 2>&1
}

ensure_app_network() {
  if ! docker_cmd network inspect "$APP_NETWORK" >/dev/null 2>&1; then
    docker_cmd network create "$APP_NETWORK" >/dev/null
  fi
}

run_bgutil_provider() {
  ensure_app_network
  docker_cmd rm -f bgutil-provider >/dev/null 2>&1 || true
  docker_cmd run -d \
    --name bgutil-provider \
    --restart unless-stopped \
    --network "$APP_NETWORK" \
    --network-alias bgutil-provider \
    "$BGUTIL_PROVIDER_IMAGE" >/dev/null
}

deploy_with_docker_container() {
  log "detected single-container docker deployment"
  mkdir -p runtime
  ensure_app_network
  run_bgutil_provider
  docker_cmd build -t song-to-lyrics .
  docker_cmd rm -f song-to-lyrics >/dev/null 2>&1 || true
  docker_cmd run -d \
    --name song-to-lyrics \
    --restart unless-stopped \
    --network "$APP_NETWORK" \
    --env-file .env \
    -e RUNTIME_ROOT=/data \
    -e BUILD_MARKER="$BUILD_MARKER" \
    -p 80:3000 \
    -p 3000:3000 \
    -v "$(pwd)/runtime:/data" \
    song-to-lyrics >/dev/null
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
BUILD_MARKER="${BUILD_MARKER:-$(git rev-parse --short HEAD)}"

if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]] && docker_compose_available; then
  deploy_with_docker_compose
elif command -v docker >/dev/null 2>&1 && docker_container_available; then
  deploy_with_docker_container
elif command -v pm2 >/dev/null 2>&1; then
  deploy_with_pm2
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^song-to-lyrics'; then
  deploy_with_systemd
else
  deploy_with_plain_node
fi

wait_for_health
wait_for_build_marker "$BUILD_MARKER"
