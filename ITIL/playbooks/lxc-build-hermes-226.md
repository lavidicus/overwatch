# Hermes Agent LXC Build — VMID 226

**Date:** 2026-04-02 | **Server:** mas (Proxmox VE) | **Status:** ✅ RUNNING

---

## 1. Container Specs

| Parameter | Value |
|-----------|-------|
| **VMID** | 226 |
| **Hostname** | hermes |
| **OS Template** | `ubuntu-24.04-standard_24.04-2_amd64.tar.zst` (via `pveam download`) |
| **CPU** | 8 cores |
| **RAM** | 8 GB |
| **Swap** | 0 |
| **Disk** | 4 GB ZFS (`mas` pool) |
| **Network** | `vmbr1`, VLAN tag **2**, IP `10.50.15.226/24`, GW `10.50.15.254` |
| **Unprivileged** | Yes |

---

## 2. Build Steps

### 2.1 Download the proper template

**Critical:** Do NOT use cloud images (`noble-server-cloudimg-*.tar.gz`) — they lack `/sbin/init` and will not boot under LXC. Use the Proxmox standard template.

```bash
ssh root@mas
pveam download local ubuntu-24.04-standard_24.04-2_amd64.tar.zst
```

### 2.2 Create the container

```bash
pct create 226 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname hermes --cores 8 --memory 8192 --swap 0 \
  --storage mas --rootfs mas:128 \
  --net0 name=eth0,bridge=vmbr1,ip=10.50.15.226/24,gw=10.50.15.254,firewall=1,tag=2,type=veth \
  --ostype ubuntu --unprivileged 1
```

**Critical:** Include `tag=2` on the network interface. Without it the container cannot reach the gateway (`10.50.15.254`) or any other host on VLAN 2. All other LXCs on mas use `tag=2`.

### 2.3 Start and configure

```bash
pct start 226
pct exec 226 -- bash -c 'echo "root:Demo1234" | chpasswd'
pct exec 226 -- apt update && apt upgrade -y
pct exec 226 -- apt install -y git python3 python3-venv python3-pip build-essential
```

### 2.4 Create localadmin user with passwordless sudo

```bash
pct exec 226 -- useradd -m -s /bin/bash localadmin
pct exec 226 -- bash -c 'echo "localadmin:Demo1234" | chpasswd'
pct exec 226 -- bash -c 'echo "localadmin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/localadmin && chmod 440 /etc/sudoers.d/localadmin'
```

### 2.5 Hosts file entries on the container

```bash
# Inside VMID 226 /etc/hosts — required for Hermes to reach services
172.16.254.100 olla
10.50.15.201 comms.9xc.io comms
```

### 2.6 Hosts file on OCG (Sam's host)

```
10.50.15.226 hermes.9xc.io hermes
```

After this: `ssh localadmin@hermes` works from OCG.

---

## 3. Hermes Agent Installation

### 3.1 Clone and install

```bash
cd /opt
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
python3 -m venv venv
. venv/bin/activate
pip install --upgrade pip
pip install -e '.[all]'
```

Installs Hermes Agent v0.6.0 with all optional dependencies including `matrix-nio[e2e]`, Discord, Telegram, Slack, etc.

### 3.2 Verify

```bash
hermes doctor   # Check dependencies and config
hermes status   # Show component status
```

---

## 4. Matrix User Registration

### 4.1 Register on Synapse (comms.9xc.io)

Registration is disabled on comms; use the **shared-secret admin API**:

```bash
ssh localadmin@comms
# Get the shared secret from homeserver.yaml
cat /etc/matrix-synapse/homeserver.yaml | grep registration_shared_secret

# Then register via Python (no sudo needed):
python3 -c "
import hmac, hashlib, requests
secret = '<shared_secret_from_above>'
r = requests.get('http://localhost:8008/_synapse/admin/v1/register')
nonce = r.json()['nonce']
mac = hmac.new(secret.encode(), digestmod=hashlib.sha1)
mac.update(nonce.encode() + b'\x00' + b'herms' + b'\x00' + b'Ingalls2026!' + b'\x00' + b'notadmin')
data = {'nonce': nonce, 'username': 'herms', 'password': 'Ingalls2026!', 'admin': False, 'mac': mac.hexdigest()}
r2 = requests.post('http://localhost:8008/_synapse/admin/v1/register', json=data)
print(r2.status_code, r2.text)
"
```

**Output includes `access_token`** — save it for Hermes config.

### 4.2 Why not `register_new_matrix_user`?

SSH to comms as root is blocked (no key); localadmin has no passwordless sudo on comms. The shared-secret API works without elevated privileges since it runs over HTTP to the local Synapse listener.

---

## 5. Hermes Configuration

### 5.1 Environment file (`/opt/hermes-agent/.env`)

```ini
MATRIX_HOMESERVER=https://comms.9xc.io
MATRIX_ACCESS_TOKEN=syt_aGVybXM_<token>
MATRIX_USER_ID=@herms:comms.9xc.io
MATRIX_ALLOWED_USERS=@lavid:comms.9xc.io
MATRIX_ENCRYPTION=true
OLLAMA_BASE_URL=http://olla:11434
CUSTOM_API_KEY=local
```

**Critical env var names** (from `gateway/platforms/matrix.py`):
- `MATRIX_HOMESERVER` — NOT `MATRIX_SERVER_URL`
- `MATRIX_USER_ID` — full `@user:server` format, NOT just username
- `MATRIX_ACCESS_TOKEN` — preferred over password auth
- `MATRIX_ENCRYPTION` — set `true` for E2EE rooms

### 5.2 Model config (`/root/.hermes/config.yaml`)

```yaml
model:
  default: llamacpp
  provider: custom
  base_url: http://olla:11434/v1
  api_key: local
```

**Critical:** The olla/llamacpp endpoint is OpenAI-compatible (`/v1/chat/completions`), not native Ollama API. Use provider `custom` (not `openai` or `ollama` — those are reserved provider names in Hermes). The `CUSTOM_API_KEY` env var must also be set.

### 5.3 Matrix connectivity

Synapse on comms listens on `127.0.0.1:8008` only. External access is via nginx reverse proxy on port 443:

```
server_name comms.9xc.io → proxy_pass http://127.0.0.1:8008
```

The hermes container must:
1. Have `10.50.15.201 comms.9xc.io comms` in `/etc/hosts` (DNS resolves to external IP which doesn't route back correctly)
2. Use `https://comms.9xc.io` as the homeserver URL (port 443, through nginx)

---

## 6. Systemd Service

### 6.1 Wrapper script (`/opt/hermes-agent/run-hermes-daemon.sh`)

```bash
#!/bin/bash
cd /opt/hermes-agent
. venv/bin/activate
exec hermes gateway run
```

**Critical:** The daemon command is `hermes gateway run` — NOT `hermes run` (which doesn't exist) or `hermes chat` (which needs interactive TTY). The `gateway` subcommand runs the messaging gateway in headless daemon mode.

### 6.2 Service file (`/etc/systemd/system/hermes-daemon.service`)

```ini
[Unit]
Description=Hermes Agent Daemon
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hermes-agent
ExecStart=/opt/hermes-agent/run-hermes-daemon.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 6.3 Service management

```bash
systemctl daemon-reload
systemctl enable hermes-daemon.service
systemctl start hermes-daemon.service
systemctl status hermes-daemon.service
journalctl -u hermes-daemon.service -f
```

---

## 7. Verification Checklist

- [ ] `ssh localadmin@hermes` from OCG works
- [ ] `systemctl status hermes-daemon.service` shows `active (running)`
- [ ] `gateway.log` shows `✓ matrix connected` and `Gateway running with 1 platform(s)`
- [ ] `gateway_state.json` shows `"gateway_state": "running"` and `"matrix": {"state": "connected"}`
- [ ] Send DM to `@herms:comms.9xc.io` — herms receives and responds
- [ ] E2EE working: logs show `Event ... successfully verified`

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No such file or directory: /sbin/init` | Used cloud image instead of Proxmox standard template | Rebuild with `pveam download` template |
| `Destination Host Unreachable` from container | Missing `tag=2` on network interface | `pct set 226 --net0 ...,tag=2,...` |
| `Invalid username or password` on Matrix | User not registered on Synapse | Register via shared-secret API |
| `ConnectTimeout` to comms.9xc.io | DNS resolves to external IP; Synapse on localhost only | Add hosts entry `10.50.15.201 comms.9xc.io` inside container |
| `Unknown provider 'openai'` | Hermes doesn't have `openai` as a provider name | Use `custom` provider with `CUSTOM_API_KEY` env var |
| `No inference provider configured` | Missing `model:` section in `~/.hermes/config.yaml` | Add proper `model.default`, `model.provider`, `model.base_url` |
| `hermes run` — invalid choice | No `run` subcommand in hermes CLI | Use `hermes gateway run` for daemon mode |
| Service crash-loops with exit 217/USER | systemd can't resolve `User=localadmin` inside LXC | Use `User=root` or run via `pct exec` |
| E2EE `MegolmEvent` undecryptable | Old messages from before herms joined | Only new messages can be decrypted; set `MATRIX_ENCRYPTION=true` |

---

## 9. Credentials Reference

| Item | Value |
|------|-------|
| **Container root** | Demo1234 |
| **localadmin** | Demo1234 (passwordless sudo) |
| **Matrix user** | @herms:comms.9xc.io |
| **Matrix password** | Ingalls2026! |
| **Matrix access token** | (stored in `/opt/hermes-agent/.env`) |
| **LLM endpoint** | http://olla:11434/v1 (API key: `local`) |

---

*Created: 2026-04-02 | Last updated: 2026-04-02 14:48 UTC*
