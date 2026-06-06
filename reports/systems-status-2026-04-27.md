# Systems Status Report

**Generated:** Monday, April 27, 2026 — 15:18 UTC  
**Prepared by:** Sam (🧑‍💼)  
**Scope:** All managed infrastructure — Gateway host, Node2, TS (Proxmox), and services

---

## 1. Gateway Host (claw) — 10.50.15.226

| Metric | Value |
|--------|-------|
| **Uptime** | 5 days, 14 hours |
| **Kernel** | 6.8.0-110-generic |
| **CPU** | Intel Xeon E5-2680 v4 @ 2.40GHz (8 cores / 8 threads) |
| **RAM** | 4.2 GiB used / 7.8 GiB total (54%) |
| **Swap** | 768 MiB used / 4.0 GiB total |
| **Root Disk** | 35 GiB used / 124 GiB (29%) |
| **Load Average** | 1.16 / 0.84 / 0.76 |
| **Network** | ens18: 10.50.15.226, Tailscale: 100.107.29.33 |
| **Gateway** | Running (PID 3256056), port 18789, loopback-only |
| **Sessions** | 94 active |
| **Tasks** | 1 running, 27 issues, 2407 total background tasks |

### OpenClaw Status
- **Heartbeat:** 30 min (main)
- **Default model:** ollama/qwen3.5:cloud (262k ctx)
- **Runtime model:** node2/llamacpp
- **Cache:** On (1215 entries)

### Recent Errors (last 6 hours)
- ⚠️ **LLM timeout** — node2/llamacpp timed out at 14:55 UTC (125s), fell back to claude-opus-4.6
- ⚠️ **Copilot auth failure** — HTTP 403 token exchange at 14:55 UTC
- ⚠️ **503 Loading model** — node2/llamacpp returned 503 at 15:07 UTC (model loading)
- ⚠️ **Memory sync failed** — CredentialsProviderError at 15:10 UTC

### Security Audit (3 CRITICAL)
1. **CRITICAL:** Exec security=full is configured for main agent — should use allowlist
2. **CRITICAL:** Open channels can reach exec-enabled agents (matrix groupPolicy=open)
3. **CRITICAL:** Open groupPolicy with elevated tools enabled — prompt injection risk

---

## 2. Node2 (GPU Server) — 172.16.254.101

| Metric | Value |
|--------|-------|
| **Uptime** | 4 days, 12 hours |
| **RAM** | 5.9 GiB used / 62 GiB total (10%) |
| **Swap** | 1.8 MiB used / 8.0 GiB total |
| **Root Disk** | 174 GiB used / 249 GiB (74%) |
| **Load Average** | 0.51 / 1.65 / 3.13 |
| **Tailscale** | 100.91.255.3 |

### GPU Status — 2× NVIDIA Quadro P6000 (24 GB each)

| GPU | Temp | Power | Limit | Util% | VRAM Used | VRAM Free | Driver |
|-----|------|-------|-------|-------|-----------|-----------|--------|
| 0 | 54°C | 69.2 W | 250 W | 0% | 21,361 MiB (87%) | 3,077 MiB (13%) | 580.126.20 |
| 1 | 45°C | 65.3 W | 250 W | 0% | 21,865 MiB (89%) | 2,573 MiB (11%) | 580.126.20 |

**Power state:** D0 (active) on both GPUs  
**CUDA:** 13.0  
**Avg power draw:** ~66.8 W (over 2.37s window)

### llama-server.service
- **Status:** ✅ Active (running since 15:07 UTC)
- **PID:** 3388390
- **Model:** llamacpp.gguf (103 GiB model directory)
- **Port:** 11434
- **GPU layers:** all (both GPUs)
- **Threads:** 12 / 12 batch
- **Context:** 262,144 tokens
- **Concurrency:** `-np 1` (single-slot — bottleneck confirmed)
- **Memory:** 5.2 GiB RSS
- **Recent activity:** Processing requests normally (task 2432 at 15:15 UTC)

### Disk Breakdown (largest)
- `/opt/models/gguf` — 103 GiB
- `/home/localadmin/projects` — 4.6 GiB
- `/home/localadmin/logs` — 73 MiB
- `/home/localadmin/tmp` — 43 MiB

---

## 3. TS (Proxmox ESXi) — 172.16.254.5

| Metric | Value |
|--------|-------|
| **Uptime** | 9 days, 11 hours |
| **RAM** | 90 GiB used / 251 GiB total (36%) |
| **Swap** | None |
| **Root Disk** | 3.5 GiB used / 897 GiB (1%) |
| **Load Average** | 0.57 / 1.60 / 3.27 |
| **Storage Pools** | SAS: 17.5T used / 7.37T free; Fast-store: 724G used / 1.84T free |

### VM Status

| VMID | Name | Status | RAM | Bootdisk |
|------|------|--------|-----|----------|
| 100 | NODE1 | ⛔ **STOPPED** | 65 GB | 128 GB |
| 101 | NODE2 | ✅ Running | 65 GB | 256 GB |
| 200 | fs.9xc.local | ✅ Running | 4 GB | 32 GB |

---

## 4. Services Status

| Service | Status | Notes |
|---------|--------|-------|
| **OpenClaw Gateway** | ✅ Running | PID 3256056, port 18789 |
| **llama-server (node2)** | ✅ Running | Port 11434, processing requests |
| **n8n** | ❌ **DOWN** | No systemd unit, no binary (only config at ~/.n8n/) |
| **gog-bridge** | ❌ **DOWN** | No service file, no binary |
| **Matrix (openclaw-matrix)** | ❌ **DOWN** | Service unit not found |

---

## 5. Cron Jobs (10 total)

| Name | Schedule | Status | Last Run |
|------|----------|--------|----------|
| node2-metrics-scraper | Every 5 min | ✅ OK | 3 min ago |
| node2-p6000-monitor | Every 4h | ✅ OK | 1h ago |
| Daily Systems Status | Weekdays 18:00 UTC | ✅ OK | 3 days ago |
| daily-systems-status (main) | Every 1d | ✅ OK | 9h ago |
| Memory Monitor | Daily 08:00 UTC | ✅ OK | 7h ago |
| Daily Node2 Cost Report | Daily 12:00 UTC | ✅ OK | 3h ago |
| 6AM CST Morning News | Daily 12:00 UTC | ✅ OK | 3h ago |
| node2-metrics-aggregator | Every 1d | ✅ OK | 2h ago |
| **Daily Self-Improvement** | Daily 14:00 UTC | ❌ **ERROR** | 1h ago |
| Monthly Invoice - Ollama | 1st of month 09:00 UTC | ⏸️ Idle | — |

**Health:** 8/10 OK, 1 ERROR, 1 IDLE

---

## 6. Outstanding Issues

### 🔴 Critical
1. **Security: Exec full trust + open groupPolicy** — 3 critical security findings in `openclaw status`. Recommend tightening to allowlist with ask prompts.
2. **Daily Self-Improvement cron** — Failed at 14:00 UTC today.

### 🟡 Medium
3. **n8n + gog-bridge dead** — No binaries or service files. Config/DB still intact at `~/.n8n/`. Needs full reinstall.
4. **Matrix service** — Unit file missing.
5. **node2 root disk at 74%** — 174/249 GiB used. Model directory (103 GiB) is the largest consumer.
6. **llama-server `-np 1`** — Still single-slot (11 days unresolved). ~700 MiB free per GPU available for a 2nd slot.

### 🟢 Low
7. **NODE1 VM stopped** on Proxmox — intentional?
8. **Copilot auth (HTTP 403)** — intermittent auth failures in gateway logs.
9. **Model loading 503s** — node2/llamacpp occasionally returns 503 during model load.

---

## 7. Summary

**Overall status: ⚠️ DEGRADED**

- 3 of 4 hosts are operational and stable
- Gateway host running normally with 3 critical security findings to address
- Node2 GPU server healthy — both GPUs idle but VRAM-pinned, llama-server processing
- TS Proxmox stable — 2/3 VMs running
- **n8n and gog-bridge are down** — automation pipeline broken
- Self-Improvement cron job errored today
- Security posture needs tightening (full exec trust + open groupPolicy)

---

*Report generated by Sam 🧑‍💼 — OpenClaw Personal Assistant*
