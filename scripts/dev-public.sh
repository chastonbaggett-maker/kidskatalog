#!/usr/bin/env bash
# Keep Next on 0.0.0.0:3456 and expose a public Cloudflare quick tunnel.
# localhost:3456 only works when Cursor desktop port-forwards this agent;
# mobile / broken forwards should use the printed https://*.trycloudflare.com URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3456}"
CF_BIN="${CF_BIN:-/tmp/cloudflared}"
URL_FILE="${URL_FILE:-$ROOT/.preview-url}"

if [[ ! -x "$CF_BIN" ]]; then
  echo "Downloading cloudflared..."
  curl -fsSL \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" \
    -o "$CF_BIN"
  chmod +x "$CF_BIN"
fi

ensure_next() {
  if curl -fsS --connect-timeout 1 "http://127.0.0.1:${PORT}/shop" >/dev/null 2>&1; then
    return 0
  fi
  echo "Starting Next.js on 0.0.0.0:${PORT}..."
  npm run dev &
  local i=0
  while (( i < 60 )); do
    if curl -fsS --connect-timeout 1 "http://127.0.0.1:${PORT}/shop" >/dev/null 2>&1; then
      echo "Next.js ready."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Next.js failed to become ready on :${PORT}" >&2
  return 1
}

ensure_next

echo "Starting Cloudflare tunnel → http://127.0.0.1:${PORT}"
rm -f /tmp/cf-tunnel.log
set +e
"$CF_BIN" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate --protocol http2 2>&1 | tee /tmp/cf-tunnel.log &
CF_PID=$!
set -e

for i in $(seq 1 40); do
  if grep -qoE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/cf-tunnel.log 2>/dev/null; then
    break
  fi
  sleep 0.5
done

URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/cf-tunnel.log | head -1 || true)"
if [[ -n "$URL" ]]; then
  printf '%s/shop\n' "$URL" | tee "$URL_FILE"
  echo "PREVIEW: ${URL}/shop"
else
  echo "Tunnel URL not detected yet — check /tmp/cf-tunnel.log" >&2
fi

wait "$CF_PID"
