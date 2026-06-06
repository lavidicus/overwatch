# Hermes Agent on VM `hermes` (172.16.254.227) — Build Notes

**Date:** 2026-05-24 | **Host:** hermes VM (Ubuntu 24.04.4) | **Status:** ✅ RUNNING
**Replaces:** Old LXC 226 on mas (see `lxc-build-hermes-226.md`)

---

## 1. VM Specs

| Parameter | Value |
|-----------|-------|
| **Hostname** | hermes |
| **IP** | 172.16.254.227 |
| **OS** | Ubuntu 24.04.4 LTS (kernel 6.8.0-117-generic) |
| **Access** | `ssh localadmin@hermes` (key-based, no password) |
| **Sudo** | passwordless via `/etc/sudoers.d/localadmin` |

---

## 2. Hermes Version

- **Hermes Agent v0.14.0** (2026.5.16) — up from 0.6.0 on the old LXC
- Repo: `https://github.com/NousResearch/hermes-agent.git`
- Install path: `/opt/hermes-agent` (owned by `localadmin`)
- Venv: `/opt/hermes-agent/venv` (Python 3.12)

**Key change vs v0.6.0:** uses `mautrix[encryption]==0.21.0` instead of `matrix-nio`. Env var names unchanged.

---

## 3. Install Steps (clean machine)

### 3.1 Prereqs
```bash
sudo apt-get update
sudo apt-get install -y git python3 python3-venv python3-pip python3-dev \
  build-essential libolm-dev pkg-config
```

### 3.2 Clone & venv
```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/NousResearch/hermes-agent.git
sudo chown -R localadmin:localadmin /opt/hermes-agent
cd /opt/hermes-agent
python3 -m venv venv
. venv/bin/activate
pip install --upgrade pip
pip install -e '.[all]'
pip install -e '.[matrix]'   # matrix is NOT in [all], install separately
```

### 3.3 Hosts entry (CRITICAL)
hermes VM is on `172.16.254.0/24`. DNS resolves `comms.9xc.io` to a Tailscale IP which is unreachable. Add:
```bash
echo '172.16.254.201 comms.9xc.io comms' | sudo tee -a /etc/hosts
```

### 3.4 Matrix user
The user `@hermes:comms.9xc.io` already exists with password `Ingalls2026!`. Login to grab a fresh access token:
```bash
curl -sS -X POST 'https://comms.9xc.io/_matrix/client/r0/login' \
  -H 'Content-Type: application/json' \
  -d '{"type":"m.login.password","user":"@hermes:comms.9xc.io","password":"Ingalls2026!","initial_device_display_name":"hermes-agent-vm"}'
```
Returns `access_token` and `device_id`.

---

## 4. Config Files

### 4.1 `/opt/hermes-agent/.env` (chmod 600, owner localadmin)
```ini
MATRIX_HOMESERVER=https://comms.9xc.io
MATRIX_USER_ID=@hermes:comms.9xc.io
MATRIX_ACCESS_TOKEN=syt_aGVybWVz_VuFRjczkydoWFvKqlxSC_2s0wTY
MATRIX_DEVICE_ID=BNIGHDGGEM
MATRIX_ALLOWED_USERS=@lavid:comms.9xc.io,@eve:comms.9xc.io,@maria:comms.9xc.io,@lucas:comms.9xc.io,@jason:comms.9xc.io
MATRIX_ENCRYPTION=true
CUSTOM_API_KEY=local
```

### 4.2 `~/.hermes/config.yaml`
```yaml
model:
  default: llamacpp
  provider: custom
  base_url: http://172.16.254.100:11434/v1
  api_key: local
```

Uses **node1** (`172.16.254.100`) for inference — Qwen3.6-35B Q4_K_M on dual P6000s.

---

## 5. Systemd Service (v0.14 native)

v0.14 ships its own installer:

```bash
sudo /opt/hermes-agent/venv/bin/hermes gateway install --system --run-as-user localadmin --force
```

Creates `/etc/systemd/system/hermes-gateway.service` and enables + starts it.

### Management
```bash
sudo systemctl {status|start|stop|restart} hermes-gateway
sudo journalctl -u hermes-gateway -f
```

---

## 6. Verification

- ✅ `systemctl status hermes-gateway` → active (running)
- ✅ Send DM to `@hermes:comms.9xc.io` from an allowed user → response generated via llamacpp
- ✅ Send DM from an unauthorized user → logs show `Unauthorized user: @user:server on matrix` (no reply)

---

## 7. Known Noise

- **Stale invite retry storm:** initial sync may include stale invites/leaves from rooms whose remote servers no longer exist. Logs spam `mautrix.errors.request.MUnknown: Can't join remote room because no servers...` and rate-limited `MLimitExceeded`. Mitigation: `curl -X POST /_matrix/client/r0/rooms/<room>/leave` then `/forget` each one. Harmless beyond log noise.
- **MEGOLM decrypt failures:** old encrypted messages from before this device's key share are undecryptable. Expected — only new messages work.

---

## 8. Credentials

| Item | Value |
|------|-------|
| VM IP | 172.16.254.227 |
| SSH | `ssh localadmin@hermes` (key-based) |
| Sudo | passwordless |
| Matrix user | `@hermes:comms.9xc.io` |
| Matrix password | `Ingalls2026!` |
| Access token (current) | `syt_aGVybWVz_VuFRjczkydoWFvKqlxSC_2s0wTY` |
| Device ID | `BNIGHDGGEM` |
| LLM endpoint | `http://172.16.254.100:11434/v1` (node1/llamacpp) |

---

*Created: 2026-05-24 23:30 UTC by Sam*
