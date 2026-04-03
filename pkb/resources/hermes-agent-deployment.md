# Hermes Agent — Deployment & Operations Guide

**Type:** Resource Note | **Created:** 2026-04-02 | **Tags:** #hermes #matrix #lxc #proxmox #ai-agent

---

## What is Hermes?

[Hermes Agent](https://github.com/NousResearch/hermes-agent) (v0.6.0) by Nous Research is a Python-based AI assistant with tool-calling capabilities. It supports multiple messaging platforms (Matrix, Discord, Telegram, Slack, WhatsApp) via a **gateway** daemon and connects to LLM backends via OpenAI-compatible APIs.

## Architecture

```
┌──────────────┐    HTTPS/443    ┌──────────────┐    HTTP/8008     ┌──────────────┐
│  Matrix      │◄───────────────►│  nginx       │◄────────────────►│  Synapse     │
│  Clients     │                 │  (comms)     │  proxy_pass      │  (localhost)  │
└──────────────┘                 └──────────────┘                  └──────────────┘
                                        ▲
                                        │ HTTPS (via /etc/hosts → 10.50.15.201)
                                        │
                                 ┌──────────────┐    HTTP/11434    ┌──────────────┐
                                 │  Hermes LXC  │◄────────────────►│  Ollama/     │
                                 │  VMID 226    │  /v1/chat/comp.  │  llama-server│
                                 │  10.50.15.226│                  │  (olla)      │
                                 └──────────────┘                  └──────────────┘
```

## Key Lessons Learned

### 1. Proxmox LXC Template Selection
- **Use Proxmox standard templates** (`pveam download`), NOT Ubuntu cloud images
- Cloud images lack `/sbin/init` and produce `Failed to exec "/sbin/init"` errors
- Standard templates include full systemd, SSH keys, proper OS detection

### 2. VLAN Tagging
- All LXCs on mas use `tag=2` on `vmbr1`
- Omitting the tag causes complete network isolation (gateway unreachable)
- Check existing containers: `pct config <vmid> | grep net` to see the pattern

### 3. Hermes CLI Commands
- **`hermes gateway run`** — headless daemon for messaging platforms ✅
- **`hermes chat`** — interactive terminal chat (needs TTY) ❌ for daemons
- **`hermes run`** — DOES NOT EXIST ❌
- **`hermes model`** — interactive model picker (needs TTY)
- **`hermes doctor`** — diagnostic check (works non-interactively)

### 4. Matrix Environment Variables
The gateway's Matrix adapter (`gateway/platforms/matrix.py`) uses specific env var names:

| Env Var | Purpose | Common Mistake |
|---------|---------|----------------|
| `MATRIX_HOMESERVER` | Server URL | Using `MATRIX_SERVER_URL` |
| `MATRIX_USER_ID` | `@user:server` | Using just `herms` |
| `MATRIX_ACCESS_TOKEN` | Token auth (preferred) | Using password only |
| `MATRIX_PASSWORD` | Password auth (fallback) | — |
| `MATRIX_ENCRYPTION` | `true` for E2EE | Omitting it |
| `MATRIX_ALLOWED_USERS` | Comma-separated allowlist | — |

### 5. Provider Configuration for Self-Hosted LLMs
Hermes has a fixed set of provider names. For self-hosted OpenAI-compatible endpoints:
- Provider must be **`custom`** (not `openai`, not `ollama`)
- Set `CUSTOM_API_KEY` env var (Hermes checks this for custom endpoints)
- Config goes in `~/.hermes/config.yaml` under `model:` section
- The endpoint must serve `/v1/chat/completions` (OpenAI-compatible)

### 6. Synapse Access from LXC Containers
- Synapse typically binds to `127.0.0.1:8008` (localhost only)
- External access goes through nginx reverse proxy on port 443
- DNS may resolve `comms.9xc.io` to the external/public IP
- **Fix:** Add internal IP to container's `/etc/hosts`: `10.50.15.201 comms.9xc.io`

### 7. Matrix User Registration Without Sudo
When `sudo` is unavailable on the Synapse host:
- Use the Synapse **shared-secret admin registration API** (`/_synapse/admin/v1/register`)
- Requires the `registration_shared_secret` from `homeserver.yaml` (readable by localadmin)
- No elevated privileges needed — it's an HTTP API call to localhost:8008
- Returns an `access_token` that can be used directly (preferred over password auth)

## Operational Notes

- **Service:** `hermes-daemon.service` on VMID 226
- **Logs:** `journalctl -u hermes-daemon.service -f` or `/root/.hermes/logs/gateway.log`
- **Gateway state:** `/root/.hermes/gateway_state.json`
- **Restart:** `systemctl restart hermes-daemon.service`
- **Config reload:** Restart required after `.env` or `config.yaml` changes

## Cross-References

- [[ITIL/playbooks/lxc-build-hermes-226]] — Full build playbook with step-by-step commands
- [[resources/proxmox-lxc-management]] — General LXC management
- [[resources/matrix-synapse-administration]] — Synapse admin operations

---

*Last updated: 2026-04-02 14:48 UTC*
