#!/usr/bin/env bash
# OpenClaw Host Migration Helper
# Interactive, menu-driven helper to transfer an OpenClaw workspace and related data
# from this (source) host to a target host over SSH.

set -euo pipefail
IFS=$'\n\t'

TARGET=""
SSH_USER_HOST=""
USE_RSYNC=false
FORCE=false

pause(){ read -rp "Press Enter to continue..."; }

echo_header(){ printf "\n=== %s ===\n" "$1"; }

check_prereqs(){
  echo_header "Prerequisites"
  command -v ssh >/dev/null || { echo "ssh required"; exit 1; }
  command -v tar >/dev/null || { echo "tar required"; exit 1; }
  echo "Local user: $(whoami)"
  echo "OpenClaw workspace: ~/.openclaw/workspace/ size: $(du -sh ~/.openclaw/workspace 2>/dev/null || echo 'N/A')"
  echo "If you need rsync on target, install it. Script will fall back to tar pipe." 
}

prompt_target(){
  read -rp "Target SSH (user@host) to migrate TO: " SSH_USER_HOST
  TARGET="$SSH_USER_HOST"
  echo "Target set to: $TARGET"
}

test_ssh(){
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$TARGET" "echo OK" >/dev/null 2>&1 && return 0 || return 1
}

check_rsync(){
  if ssh "$TARGET" "command -v rsync >/dev/null" 2>/dev/null; then
    USE_RSYNC=true
    echo "rsync available on target — will prefer rsync"
  else
    USE_RSYNC=false
    echo "rsync not available on target — will use tar+ssh"
  fi
}

backup_target(){
  echo_header "Backup existing target workspace/config (remote)"
  ssh "$TARGET" "mkdir -p ~/.openclaw/backups && cp -a ~/.openclaw/openclaw.json ~/.openclaw/backups/openclaw.json.$(date -u +%s) 2>/dev/null || true; mkdir -p ~/.openclaw/backups/workspace.$(date -u +%s) && echo 'backup placeholder' > ~/.openclaw/backups/ok"
  echo "Target backup (meta) created under ~/.openclaw/backups on target"
}

transfer_workspace(){
  echo_header "Transfer workspace"
  echo "This will overwrite target ~/.openclaw/workspace (target backup will be created first)."
  read -rp "Proceed? (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Cancelled."; return 1; }
  echo "Creating backup on target..."
  ssh "$TARGET" "mkdir -p ~/.openclaw/backups && mv ~/.openclaw/workspace ~/.openclaw/backups/workspace.$(date -u +%s) 2>/dev/null || true && mkdir -p ~/.openclaw"

  if $USE_RSYNC; then
    echo "Using rsync..."
    rsync -avz --progress ~/.openclaw/workspace/ "$TARGET":~/.openclaw/workspace/
  else
    echo "Using tar+ssh..."
    (cd ~/.openclaw && tar czf - workspace) | ssh "$TARGET" "cd ~/.openclaw && tar xzf -"
  fi
  echo "Workspace transfer complete."
}

transfer_skills(){
  echo_header "Transfer installed skills (optional)"
  read -rp "Transfer ~/.openclaw/skills/? (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Skipped."; return 0; }
  if $USE_RSYNC; then
    rsync -avz --progress ~/.openclaw/skills/ "$TARGET":~/.openclaw/skills/
  else
    (cd ~/.openclaw && tar czf - skills) | ssh "$TARGET" "cd ~/.openclaw && tar xzf -"
  fi
  echo "Skills copied." 
}

transfer_agents(){
  echo_header "Transfer agents/session history (optional, risky)"
  echo "WARNING: agent sessions and identity files are host-specific. Copying identity/devices can cause pairing issues."
  read -rp "Copy agents/ (sessions) to target? (only if you know what you're doing) (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Skipped."; return 0; }
  (cd ~/.openclaw && tar czf - agents) | ssh "$TARGET" "cd ~/.openclaw && tar xzf -"
  echo "Agents copied — be prepared to fix device identity issues on target (see playbook)."
}

copy_openclaw_config(){
  echo_header "Copy openclaw.json (merge recommended)"
  echo "We recommend merging configs. This will copy source config to /tmp on target for manual merge."
  read -rp "Copy full openclaw.json to target /tmp/source-openclaw.json? (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Skipped."; return 0; }
  scp ~/.openclaw/openclaw.json "$TARGET":/tmp/source-openclaw.json
  echo "Source config copied to $TARGET:/tmp/source-openclaw.json — merge it into target ~/.openclaw/openclaw.json manually."
}

append_ssh_key(){
  echo_header "Append local public key to target authorized_keys"
  if [[ ! -f ~/.ssh/id_rsa.pub && ! -f ~/.ssh/id_ed25519.pub ]]; then
    echo "No public key found in ~/.ssh. Generate one (ssh-keygen) then re-run."
    return 1
  fi
  PUBKEY=$(cat ~/.ssh/id_rsa.pub 2>/dev/null || cat ~/.ssh/id_ed25519.pub)
  echo "About to append your public key to $TARGET:~/.ssh/authorized_keys (will create .ssh if missing)"
  read -rp "Proceed? (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Skipped."; return 0; }
  ssh "$TARGET" "mkdir -p ~/.ssh && umask 0077 && touch ~/.ssh/authorized_keys"
  echo "$PUBKEY" | ssh "$TARGET" "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
  echo "Public key appended on target." 
}

export_cron_jobs(){
  echo_header "Export cron jobs (source)"
  if [[ -f ~/.openclaw/cron/jobs.json ]]; then
    scp ~/.openclaw/cron/jobs.json "$TARGET":~/.openclaw/cron/jobs.json.source_backup
    echo "jobs.json copied to target as jobs.json.source_backup"
  else
    echo "No cron jobs file at ~/.openclaw/cron/jobs.json on source. If you used cron tool, use the cron list command to export." 
  fi
}

restart_gateway_target(){
  echo_header "Restart OpenClaw gateway on target"
  read -rp "This will stop/start gateway on target (may drop active sessions). Proceed? (y/N): " yn || true
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Skipped."; return 0; }
  ssh "$TARGET" "openclaw gateway stop && sleep 3 && openclaw gateway start"
  echo "Target gateway restarted."
}

final_notes(){
  echo_header "Final notes & next steps"
  cat <<EOF
What I did NOT copy automatically (you must handle on target, or confirm before copying):
 - ~/.openclaw/identity/  (device identity)  => regenerate on target (remove stale files and restart gateway)
 - ~/.openclaw/devices/   (paired devices)   => leave target-managed
 - system keyrings (OAuth tokens)            => re-authenticate (gog etc.)

Recommended post-migration verification (on target):
 - openclaw status
 - openclaw doctor --non-interactive
 - openclaw memory status --deep
 - Verify crons via cron tool (cron list/status)
 - Re-authenticate gog: gog auth add ...
 - Ensure SSH to other remote hosts works from target (ssh-copy-id where needed)

Playbook location: ~/.openclaw/workspace/playbooks/2026-04-08-openclaw-host-migration.md
PKB resource: ~/.openclaw/workspace/pkb/resources/openclaw-host-migration.md

EOF
}

menu(){
  PS3="Choose an action: "
  options=("Pre-flight checks" "Set target" "Test SSH to target" "Check rsync on target" "Backup target" "Transfer workspace" "Transfer skills" "Transfer agents (risky)" "Copy openclaw.json to target /tmp" "Append SSH public key to target" "Export cron jobs" "Restart target gateway" "Final notes" "Run full migration (quick)" "Quit")
  select opt in "${options[@]}"; do
    case $opt in
      "Pre-flight checks") check_prereqs; pause;;
      "Set target") prompt_target; check_rsync; pause;;
      "Test SSH to target") if test_ssh; then echo "SSH OK"; else echo "SSH failed"; fi; pause;;
      "Check rsync on target") check_rsync; pause;;
      "Backup target") backup_target; pause;;
      "Transfer workspace") transfer_workspace; pause;;
      "Transfer skills") transfer_skills; pause;;
      "Transfer agents (risky)") transfer_agents; pause;;
      "Copy openclaw.json to target /tmp") copy_openclaw_config; pause;;
      "Append SSH public key to target") append_ssh_key; pause;;
      "Export cron jobs") export_cron_jobs; pause;;
      "Restart target gateway") restart_gateway_target; pause;;
      "Final notes") final_notes; pause;;
      "Run full migration (quick)")
         echo "Running full migration: backup -> workspace -> skills -> append key -> export cron";
         backup_target; transfer_workspace; transfer_skills; append_ssh_key; export_cron_jobs; echo "Full migration done. Please restart gateway on target and re-authenticate services."; pause;;
      "Quit") echo "Bye"; break;;
      *) echo "Invalid option";;
    esac
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo_header "OpenClaw Migration Helper"
  check_prereqs
  menu
fi
