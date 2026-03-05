#!/usr/bin/env bash
set -euo pipefail

# Safe restart wrapper for OpenClaw gateway
# - Uses systemctl (preferred)
# - Waits for service health
# - Reminds to start a new session after restart to avoid stale tool-call state

SERVICE="openclaw-gateway"
MAX_WAIT_SEC=20
SLEEP_STEP=2

log() { printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"; }

log "Restarting ${SERVICE} via systemctl --user…"
systemctl --user restart "${SERVICE}"

log "Waiting for ${SERVICE} to become active…"

elapsed=0
while true; do
  status=$(systemctl --user is-active "${SERVICE}" || true)
  if [[ "$status" == "active" ]]; then
    log "${SERVICE} is active."
    break
  fi
  if (( elapsed >= MAX_WAIT_SEC )); then
    log "Timeout waiting for ${SERVICE} (last status: ${status})."
    exit 1
  fi
  sleep "${SLEEP_STEP}"
  elapsed=$((elapsed + SLEEP_STEP))
done

log "NOTE: Start a NEW session after restart to avoid pending tool-call state."
log "If tool errors persist, repair the session transcript or reset the session."
