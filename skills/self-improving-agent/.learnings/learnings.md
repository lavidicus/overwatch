### 2026-04-11
- Discovered `clawhub` CLI flags differ from documentation; `--updates` is unsupported. Use `clawhub list` and `clawhub sync` or consult `clawhub --help` before scripting.
- .learnings directory was missing previously; created learnings.md to capture quick discoveries.

### 2026-04-24
- `clawhub sync --dry-run` requires `clawhub login` to check for updates. Without login, update checking is impossible.
- `llama-server -np 1` has been a known bottleneck since 2026-04-16 (8 days). Single-slot mode causes queueing on concurrent requests and fallback to Opus.
- Daily memory file hygiene has improved significantly — no duplication issues found in recent files (Apr 22-24).
- node2-metrics-aggregate-daily cron fixed on Apr 19 — no longer in error state.

### 2026-04-25
- All 12 cron jobs now healthy (Daily Systems Status Report recovered from error on Apr 24). No cron jobs in error state.
- n8n is unreachable on gateway host (`ocg.9xc.local:5678` and `127.0.0.1:5678`). Service appears down.
- gog-bridge service is inactive. Needed for n8n workflow automation.
- TS SAS disk at 66% (15T/22T) — trending up, needs planning before hitting 80%.
- VM 100 (NODE1) still stopped on Proxmox — may need to be decommissioned or investigated.

### 2026-04-26
- n8n root cause traced: npx binary exists (`~/.npm/_npx/.../n8n` v2.15.1) with config at `~/.n8n/`, but no systemd unit file. Confirmed lost during OCG→claw host migration.
- n8n was installed via npm on previous host "ocg" (hostname changed to "claw"). Service file was not recreated during migration.
- To restore: `npm install -g n8n` + create systemd unit pointing to `/home/localadmin/.npm-global/bin/n8n`.
- `clawhub sync` is for publishing, `clawhub update` is for updating installed skills. `--version` flag doesn't exist — use `clawhub -V`.
- Daily memory files well-maintained — zero duplication this cycle (improving from earlier bugs).
- 2026-04-27: npx cache no longer has n8n binary (stale after 19 days), only config/DB at `~/.n8n/` remain. Both n8n and gog-bridge completely dead — no binaries left, not just no systemd unit. Need full reinstall, not service recreation.
- 2026-04-27: `clawhub update --all` shows 4 skills with local changes (self-improving-agent, cost-report, voice-transcribe, self-improving). This is expected since we maintain them — not an update blockage, just normal state.
