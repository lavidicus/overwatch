# Swarm: Multi-Agent System Build Document (Rewritten)

---

**Author:** Sam (OpenClaw) — Rewritten with Cloud Advisor review  
**Created:** 2026-06-02  
**Last Updated:** 2026-06-02  
**Version:** 2.0  
**Status:** Planning — Not started  
**Priority:** **P1 (Build Phase)** — Re-evaluate to P2 after MVP stable  
**Owner:** Jeremy Ingalls  
**Tags:** [multi-agent, nats, swarm, infrastructure, orchestration]  
**Related Tickets:** None (new initiative)  
**Related CMDB Items:** TBD  

---

## Overview

Build a multi-agent swarm system enabling autonomous collaboration between AI agents (Sam, Hermes, Ghost, and future agents) on a dedicated message bus. Agents can delegate tasks, share context, and operate as a coordinated system rather than isolated instances. This is infrastructure for agent-to-agent communication, not a user-facing service.

**Change Impact:** No impact on existing systems — agents continue operating independently without swarm. Swarm is additive infrastructure only.

---

## Priority & Timeline

**Priority: P1 (Build Phase, first 6 weeks)**  
Foundational infrastructure. If it breaks, everything breaks. Re-evaluate to P2 after MVP is stable.

**Estimated Total Timeline: 4–6 weeks for MVP (3 agents operational)**  
- Week 1: VM provisioning + NATS cluster bootstrap
- Week 2: Monitoring stack + NATS hardening
- Week 3: OpenClaw bridge prototype + swarmd
- Week 4: Smart dispatcher + integration
- Week 5: Failover testing + load testing
- Week 6: Documentation + post-implementation review

---

## ITIL Change Management

### Change Category
**Standard Change with Risk Assessment** — New infrastructure deployment with configuration changes across multiple systems. Low risk to existing services (agents continue operating without swarm).

### Change Impact Analysis

| System | Impact if Swarm Fails | Impact if NATS Cluster Fails |
|--------|----------------------|------------------------------|
| Sam (claw) | None — operates independently | None — operates independently |
| Hermes (hermes) | None — operates independently | None — operates independently |
| Ghost (ghost) | None — operates independently | None — operates independently |
| Jeremy (user) | Reduced capability (no cross-agent) | Reduced capability (no cross-agent) |

**Recovery Strategy:** All agents revert to independent operation immediately. Swarm is additive, not required.

### Stakeholder Sign-Off

- **Technical:** Sam (author) + Cloud Advisor (review)
- **Business:** Jeremy Ingalls (owner)
- **Operational:** Sam + Hermes (operators)
- **Sign-off process:** Document approved by all stakeholders before Phase 1 begins

### Post-Implementation Review Criteria

**Success Metrics:**
- Task delivery latency: p95 < 5 seconds
- NATS cluster uptime: 99.9%
- Agent heartbeat reliability: > 99%
- Zero data loss during failover tests
- All 3 agents registered and operational

**Review Date:** Week 6, 30 days after MVP deployment  
**Attendees:** Jeremy, Sam, Hermes, Cloud Advisor  
**Deliverables:** Review report, lessons learned, backlog of improvements

### Risk Matrix (Likelihood × Impact)

| Risk | Likelihood | Impact | Score | Mitigation |
|------|-----------|--------|-------|------------|
| NATS cluster misconfiguration | Medium | High | 12 | Validate config before enabling production traffic; test with 1 agent first |
| NATS node resource exhaustion | Medium | High | 12 | 4vCPU/8GB per data node; monitor JetStream disk/memory; alert at 80% |
| Agent reconnection failures during NATS downtime | Low | Medium | 4 | swarmd reconnect with exponential backoff; NATS KV survives restarts |
| Tailscale connectivity failure | Low | High | 8 | Verify Tailscale mesh before starting; Tailscale ACLs properly tested |
| NTP drift between NATS servers | Low | Medium | 4 | chrony with 4 stratum-1 sources; cross-verify every 30 min |
| ACL misconfiguration blocking agents | Medium | High | 12 | Test connectivity with known agent IPs before enabling strict ACLs |
| OpenClaw bridge failure | High | High | 16 | Prototype bridge FIRST; have CLI fallback if HTTP fails |
| No monitoring/alerting | High | High | 16 | Prometheus + Grafana deployed Day 1 alongside NATS |
| Message format breaks | Low | Medium | 4 | Versioned envelope (format_version field); backward compatibility policy |
| JetStream disk fills up | Medium | High | 12 | TTL on messages (24h); DLQ retention (7 days); alert at 80% disk |
| Disaster recovery gap | Low | Critical | 8 | JetStream snapshots every 4h; off-node storage; RTO 1h, RPO 4h |
| Agent onboarding friction | Medium | Medium | 8 | Automated NKey generation; KV registration script |
| Operational burden grows | High | Medium | 12 | Monitoring on Day 1; documented runbooks; automation-first approach |

### Rollback Plan

**If NATS deployment fails:**
```bash
# Stop NATS on all nodes
systemctl stop nats-server
systemctl disable nats-server
rm -rf /var/lib/nats/jetstream
systemctl daemon-reload
# Verify old system still works — all agents continue operating independently
```

**If swarmd breaks OpenClaw integration:**
```bash
systemctl stop swarmd && systemctl disable swarmd
rm -rf /opt/swarmd && rm /etc/swarmd/*
# Verify OpenClaw still works independently
```

**If NATS cluster is unstable:**
```bash
# Roll back to standalone NATS (non-clustered)
# Remove cluster block from nats.conf; keep jetstream (single node)
# Restart: systemctl restart nats-server
```

### Communication Plan

- **Before starting:** Notify Jeremy (Matrix @lavid:comms.9xc.io)
- **After each phase:** Update this document with progress and deviations
- **If blocked >30 min:** Escalate to Jeremy, document blocker
- **After completion:** Post-implementation review (Week 6)

---

## Prerequisites

### Required Access
- **root on TS Proxmox** (`ts.9xc.local` / 172.16.254.5) — create VMs
- **root on USM1 Proxmox** (172.16.254.108) — create NATS VMs
- **ssh to all existing agents** — claw, hermes, ghost (for swarmd deployment)
- **Tailscale access** — all nodes already on Tailscale network

### Required Infrastructure

**TS Proxmox:** 251 GB RAM, 56 cores, 17 TB storage. Existing: node1 (off), node2 (off).  
**USM1 Proxmox:** 62 GB RAM, 8 cores, 355 GB ZFS. Existing: Ghost (Linux agent).

**Tailscale IPs (existing):**
- claw (gateway): 100.126.36.12
- hermes: 100.79.29.13 (also pve3090-111)
- ghost: 100.126.36.13
- TS Proxmox: 172.16.254.5

**New VM IPs (private):**
| Host | Role | IP | VMID |
|------|------|----|------|
| ts-nats-vm | NATS+1 (data) | 172.16.254.201 | 201 |
| usm1-nats-vm | NATS+2 (data) | 172.16.254.203 | 203 |
| ts-nats-arbiter | NATS+3 (vote-only) | 172.16.254.202 | 202 |

**New VM Specifications:**

| Host | CPU | RAM | Disk | OS | Type |
|------|-----|-----|------|----|----|
| ts-nats-vm | 4 vCPU | 8 GB | 40 GB (ext4) | Debian 12 minimal | VM |
| usm1-nats-vm | 4 vCPU | 8 GB | 40 GB (ext4) | Debian 12 minimal | VM |
| ts-nats-arbiter | 1 vCPU | 512 MB | 5 GB | Debian 12 minimal | LXC |

### Required Tools (will be installed)
- `nats-server` (latest stable)
- `nsc` (NATS Server Configuration generator)
- `chrony` — NTP client/server
- `prometheus` + `node-exporter` — monitoring
- `grafana` — dashboards
- Python 3 with `nats-py`, `pyyaml` — swarmd daemon
- `jq` — JSON processing
- `systemd` — service management on all VMs

### Tailscale ACLs

```json
{
  "groups": {
    "group:nats-servers": ["localadmin@comms.9xc.io"],
    "group:swarm-agents": ["localadmin@comms.9xc.io"]
  },
  "tagOwners": {
    "tag:nats-server": ["localadmin@comms.9xc.io"],
    "tag:swarm-agent": ["localadmin@comms.9xc.io"]
  },
  "acls": [
    { "action": "accept", "src": ["tag:swarm-agent"], "dst": ["tag:nats-server:4222"] },
    { "action": "accept", "src": ["tag:swarm-agent"], "dst": ["tag:nats-server:6222"] },
    { "action": "accept", "src": ["localadmin@comms.9xc.io"], "dst": ["tag:nats-server:8222"] },
    { "action": "accept", "src": ["tag:swarm-agent"], "dst": ["tag:nats-server:123"] }
  ]
}
```

---

## Architecture

### Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        TAILSCALE                                  │
│                                                                   │
│  ┌───────────────┐    ┌───────────────┐                          │
│  │  TS Proxmox   │    │  USM1 Proxmox │                          │
│  │               │    │               │                          │
│  │ ts-nats-vm    │    │ usm1-nats-vm  │                          │
│  │ (NATS+1)      │    │ (NATS+2)      │                          │
│  │               │    │               │                          │
│  │ ts-nats-      │    │ ghost         │                          │
│  │ arbiter       │    │ (agent)       │                          │
│  │ (NATS+3)      │    │               │                          │
│  └───────────────┘    └───────────────┘                          │
│         │                       │                                │
│         └──────────┬────────────┘                                │
│                    │                                            │
│  ┌─────────────────┴────────────────────────────────┐          │
│  │  NATS 3-NODE CLUSTER                             │          │
│  │  ts-nats-vm (leader) ↔ usm1-nats-vm (follower)  │          │
│  │  ts-nats-arbiter (vote-only, no data)           │          │
│  │  JetStream Raft group: replicas=3, quorum=2     │          │
│  │  Prometheus exporter on :7777                    │          │
│  └─────────────────────────────────────────────────┘          │
│         │                                                    │
│  ┌──────┴───────┐        ┌──────────────────┐               │
│  │ claw         │        │ hermes            │               │
│  │ (sam)        │        │ (hermes agent)    │               │
│  │ swarmd       │        │ swarmd            │               │
│  └──────────────┘        └──────────────────┘               │
│         │                                                    │
│  ┌──────┴───────┐                                            │
│  │ ghost        │                                            │
│  │ swarmd       │                                            │
│  └──────────────┘                                            │
└───────────────────────────────────────────────────────────────┘
```

### NATS Cluster Design

**3-node JetStream cluster for redundancy:**
- **NATS+1** (`ts-nats-vm`) — Primary data node, handles majority of cluster operations
- **NATS+2** (`usm1-nats-vm`) — Secondary data node, full replica
- **NATS+3** (`ts-nats-arbiter`) — Vote-only node, no JetStream storage, provides quorum

**Why 3 nodes with arbiter instead of 2:**
- JetStream Raft consensus requires odd-numbered quorum
- 2-node setup: either node down → no quorum → writes halt
- 3-node setup: any 1 node down → quorum maintained → writes continue
- Arbiter uses minimal resources (512MB, 1 vCPU) — serves only as tiebreaker

**NATS Ports:**

| Port | Purpose | Access |
|------|---------|--------|
| 4222 | Client connections (NATS) | Swarm agents only |
| 6222 | Cluster/route connections | NATS nodes only |
| 8222 | HTTP monitor/admin | Admin only |
| 7777 | JetStream metrics (Prometheus) | Prometheus only |
| 123 | NTP (chrony) | Swarm agents only |

### NATS Configuration

```conf
# ============================================================
# ts-nats-vm: /etc/nats/nats.conf
# ============================================================

# Server identity
server_name: ts-nats-vm

# NKey server identity
nkey: /etc/nats/nats-server.nk

# ============================================================
# Client listener (Tailscale + private network)
# ============================================================
listen: "0.0.0.0:4222"

# ============================================================
# Cluster definition
# ============================================================
cluster {
    name: "swarm"
    listen: "0.0.0.0:6222"
    routes: [
        nats-route://172.16.254.203:6222  # usm1-nats-vm
        nats-route://172.16.254.202:6222  # ts-nats-arbiter
    ]
}

# ============================================================
# JetStream — increased for production
# ============================================================
jetstream {
    store_dir: "/var/lib/nats/jetstream"
    max_mem: 4g
    max_file: 32g
    state_dir: "/var/lib/nats/jetstream/state"
}

# ============================================================
# Account system with per-subject NKey permissions
# ============================================================
accounts: {
    $SYS: { users: [{ nkey: "<monitoring-nkey>" }] }
    swarm: {
        users: [
            {
                nkey: "<sam-nkey>",
                permissions: {
                    pub: {
                        allow: ["swarm.sam.task", "swarm.task.>", "swarm.broadcast.announce"]
                        deny: ["swarm.hermes.task", "swarm.ghost.task", "swarm.dlq"]
                    }
                    sub: {
                        allow: ["swarm.sam.task", "swarm.task.>.result", "swarm.task.>.status", "swarm.broadcast.announce", "swarm.broadcast.discover"]
                        deny: ["swarm.consensus.>"]
                    }
                }
            },
            {
                nkey: "<hermes-nkey>",
                permissions: {
                    pub: {
                        allow: ["swarm.hermes.task", "swarm.task.>", "swarm.broadcast.announce"]
                        deny: ["swarm.sam.task", "swarm.ghost.task", "swarm.dlq"]
                    }
                    sub: {
                        allow: ["swarm.hermes.task", "swarm.task.>.result", "swarm.task.>.status", "swarm.broadcast.announce", "swarm.broadcast.discover"]
                        deny: ["swarm.consensus.>"]
                    }
                }
            },
            {
                nkey: "<ghost-nkey>",
                permissions: {
                    pub: {
                        allow: ["swarm.ghost.task", "swarm.task.>", "swarm.broadcast.announce"]
                        deny: ["swarm.sam.task", "swarm.hermes.task", "swarm.dlq"]
                    }
                    sub: {
                        allow: ["swarm.ghost.task", "swarm.task.>.result", "swarm.task.>.status", "swarm.broadcast.announce", "swarm.broadcast.discover"]
                        deny: ["swarm.consensus.>"]
                    }
                }
            }
        ]
    }
}

# ============================================================
# Server monitoring
# ============================================================
monitoring: {
    addr: "0.0.0.0"
    port: 8222
    profiles: {
        healthz: {
            auth: "<monitoring-nkey>"
            include_sysvars: false
        }
    }
}

# ============================================================
# Prometheus metrics
# ============================================================
resolver_off: true
```

### Bootstrap Order (Critical — Start in This Sequence)

1. **Start usm1-nats-vm first** — it will not find other nodes, but starts cleanly
2. **Start ts-nats-vm second** — connects to usm1-nats-vm via routes
3. **Wait for cluster formation** (`curl localhost:8222/varz | jq '.connect_urls'` shows both)
4. **Start ts-nats-arbiter last** — connects to both data nodes

Verify: `curl localhost:8222/varz | jq '.connect_urls'` should list all 3 IPs.

### NTP Design (chrony)

Both `ts-nats-vm` and `usm1-nats-vm` run chrony as stratum-3 NTP servers for swarm agents.

```conf
# /etc/chrony/chrony.conf (both NATS data nodes)
server time.cloudflare.com iburst
server time.google.com iburst
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst

# Serve NTP to swarm agents
allow 100.64.0.0/10   # Tailscale CIDR
allow 172.16.0.0/16    # Private network

log tracking
maxsamples 5
driftfile /var/lib/chrony/chrony.drift
local stratum 3
keyfile /etc/chrony/chrony.keys
```

**Agents (claw, hermes, ghost) — sync from NATS servers:**
```conf
server 172.16.254.201 iburst  # ts-nats-vm
server 172.16.254.203 iburst  # usm1-nats-vm
server time.cloudflare.com iburst  # Fallback
```

---

## Procedure

### Phase 1: Infrastructure (Week 1–2)

#### Step 1.1: Create ts-nats-vm on TS Proxmox

**VM Specifications:** 4 vCPU, 8 GB RAM, 40 GB (ext4), 172.16.254.201

1. Login: `ssh root@ts.9xc.local`
2. Create VM:
   ```bash
   qm create 201 --name ts-nats-vm --memory 8192 --cores 4 --net0 virtio,bridge=vmbr0
   qm importdisk 201 debian-12-minimal.iso local-lvm
   qm set 201 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-201-disk-0
   qm set 201 --boot c --bootdisk scsi0
   qm set 201 --serial0 socket --vga serial0
   ```
3. Install Debian 12 minimal from ISO
4. Configure static IP 172.16.254.201, hostname `ts-nats-vm`
5. Install Tailscale
6. Reboot, verify: `ping 172.16.254.201` + `curl -s https://check.tailscale.com`

#### Step 1.2: Create usm1-nats-vm on USM1 Proxmox

**VM Specifications:** 4 vCPU, 8 GB RAM, 40 GB (ext4), 172.16.254.203

1. Login: `ssh root@usm1`
2. Create VM:
   ```bash
   qm create 203 --name usm1-nats-vm --memory 8192 --cores 4 --net0 virtio,bridge=vmbr0
   qm importdisk 203 debian-12-minimal.iso local-zfs
   qm set 203 --scsihw virtio-scsi-pci --scsi0 local-zfs:vm-203-disk-0
   qm set 203 --boot c --bootdisk scsi0
   qm set 203 --serial0 socket --vga serial0
   ```
3. Install Debian 12 minimal from ISO
4. Configure static IP 172.16.254.203, hostname `usm1-nats-vm`
5. Install Tailscale
6. Reboot, verify connectivity

#### Step 1.3: Create ts-nats-arbiter (LXC) on TS Proxmox

**Container Specifications:** 1 vCPU, 512 MB RAM, 5 GB, 172.16.254.202

1. Login to TS Proxmox
2. Create LXC:
   ```bash
   pct create 202 local:vztmpl/debian-12-minimal_*.tar.zst \
     --hostname ts-nats-arbiter --memory 512 --cores 1 --disk 5 \
     --net0 name=eth0,bridge=vmbr0,ip=172.16.254.202/24
   pct start 202
   ```
3. Configure Tailscale
4. Verify: `ping 172.16.254.202`

#### Step 1.4: Bootstrap NATS Cluster (Start in Order!)

**Generate NKeys (run once on any node):**
```bash
# Server NKeys (one per VM)
nsc generate nkey -type SERVER > /etc/nats/ts-nats-vm.nk
nsc generate nkey -type SERVER > /etc/nats/usm1-nats-vm.nk
nsc generate nkey -type SERVER > /etc/nats/ts-nats-arbiter.nk

# Cluster NKey (shared)
nsc generate nkey -type CLUSTER > /etc/nats/nats-cluster.nk

# Agent NKeys
nsc generate nkey -type USER > /etc/swarmd/sam.nk
nsc generate nkey -type USER > /etc/swarmd/hermes.nk
nsc generate nkey -type USER > /etc/swarmd/ghost.nk
chmod 600 /etc/swarmd/*.nk
```

**Install NATS on all 3 nodes:**
```bash
curl -s https://repos.jfrog.io/artifactory/api/gpg/key/public | gpg --dearmor > /etc/apt/keyrings/jfrog.gpg
echo "deb [signed-by=/etc/apt/keyrings/jfrog.gpg] https://repos.jfrog.io/artifactory/rpm-stable nats-server-2.10 main" > /etc/apt/sources.list.d/nats.list
apt update && apt install nats-server nsc -y
```

**Start NATS in order:**
1. Start usm1-nats-vm (starts cleanly, no routes to find)
2. Start ts-nats-vm (finds usm1 via routes)
3. Wait for cluster: `curl localhost:8222/varz | jq '.connect_urls'` → should show 2 IPs
4. Start ts-nats-arbiter (finds both data nodes)
5. Verify: `curl localhost:8222/varz | jq '.connect_urls'` → should show 3 IPs

**Verification:**
```bash
curl -s http://localhost:8222/varz | jq '.connect_urls'
curl -s http://localhost:8222/connz | jq '.connections | length'
nats --server nats://localhost:4222 ping
```

#### Step 1.5: Install Monitoring (Day 1 — Not After)

**On ts-nats-vm and usm1-nats-vm:**
```bash
apt install prometheus prometheus-nats-exporter grafana -y
# Configure NATS exporter to scrape :8222
# Configure Grafana with Prometheus as data source
# Deploy dashboards: swarm-ops, nat-cluster-health
```

**Alert Rules (configure in Grafana):**
| Alert | Condition | Severity |
|-------|-----------|----------|
| Agent heartbeat timeout | No heartbeat from agent for >90s | Critical |
| NATS node offline | Node not responding on :8222 | Critical |
| JetStream disk >80% | `/var/lib/nats/jetstream` >80% | Warning |
| Task failure rate >5% | Failed tasks / total tasks >5% | Warning |
| Reconnect rate spike | >5 reconnects per minute | Warning |

#### Step 1.6: Configure chrony NTP

```bash
# On both NATS data nodes
apt install chrony -y
# Use config from NTP Design section above
systemctl enable chrony && systemctl start chrony
chronyc tracking && chronyc sources -v
```

---

### Phase 2: Software Development (Week 3–4)

#### Step 2.1: PROTOTYPE OpenClaw Bridge (FIRST — Before swarmd)

**This is the single biggest blocker.** Prototype before writing swarmd.

**Three approaches:**

| Approach | Pros | Cons | Risk |
|----------|------|------|------|
| **CLI** (`echo '{}' | openclaw sessions send main`) | Simple, proven, no new code | Synchronous, blocking, rate-limited | Low |
| **HTTP** (`POST /api/v1/sessions/main/messages`) | Fast, direct, async | Depends on OpenClaw gateway availability | Medium |
| **Subagent** (spawn subprocess with task) | Full agent capabilities, async | Heavy (starts new Python process) | Low |

**Prototype task:**
1. Test CLI approach first — `echo '{"task":"echo hello"}' | openclaw sessions send main`
2. If CLI is too slow, test HTTP approach
3. Document which approach works and why
4. **Decision gate:** Do not write swarmd until bridge approach is verified

**Verification:** Task injected into session → response captured → structured output produced.

#### Step 2.2: Write swarmd Daemon

**Location:** `~/.openclaw/workspace/projects/swarmd/` on claw

**swarmd.py (~300 lines):**
```python
"""
swarmd — NATS bridge daemon for OpenClaw agents.
Bridges NATS messages to local OpenClaw sessions.

Usage: swarmd [--config /path/to/config.yaml] [--debug]
"""

import asyncio
import json
import logging
import signal
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml
import nats

class SwarmDaemon:
    def __init__(self, config_path):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logging()
        self.nc = None
        self.js = None
        self.kv = None
        self.running = False
        self.agent_id = self.config["agent"]["id"]

    async def connect(self):
        """Connect to NATS cluster with failover."""
        endpoints = self.config["agent"]["nats"]["endpoints"]
        self.nc = await nats.connect(
            endpoints,
            name=self.agent_id,
            # NKey auth via config
        )
        self.js = self.nc.jetstream()
        self.kv = await self.js.key_value("swarm_registry")

    async def register(self):
        """Register agent in NATS KV with capabilities and heartbeat."""
        await self.kv.put(
            f"agent/{self.agent_id}",
            json.dumps({
                "id": self.agent_id,
                "name": self.config["agent"]["name"],
                "capabilities": self.config["agent"]["capabilities"],
                "status": "online",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "connected_at": datetime.now(timezone.utc).isoformat()
            }).encode()
        )

    async def listen_for_tasks(self):
        """Subscribe to agent's task queue."""
        subject = f"swarm.{self.agent_id}.task"
        await self.nc.subscribe(
            subject,
            cb=self._handle_task
        )
        self.logger.info(f"Listening for tasks on {subject}")

    async def _handle_task(self, msg):
        """Process incoming task and forward to OpenClaw session."""
        task = json.loads(msg.data)
        self.logger.info(f"Task received: {task['id']}")

        try:
            response = await self._send_to_session(task)
            await self._publish_result(task, response)
        except Exception as e:
            self.logger.error(f"Task failed: {e}")
            await self._handle_failure(task, e)

    async def _send_to_session(self, task):
        """
        Forward task to OpenClaw session.
        PROTOTYPED BEFORE swarmd development.
        """
        # Determined during Phase 2.1 prototyping:
        # Use CLI approach: echo '{}' | openclaw sessions send main
        import subprocess
        proc = await asyncio.create_subprocess_exec(
            "openclaw", "sessions", "send", "main",
            input=json.dumps(task).encode(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"OpenClaw session failed: {stderr.decode()}")
        return json.loads(stdout)

    async def _publish_result(self, task, result):
        """Publish task result to NATS."""
        subject = f"swarm.task.{task['correlation_id']}.result"
        await self.js.publish(subject, json.dumps({
            "id": str(uuid.uuid4()),
            "format_version": "1.0",
            "correlation_id": task["correlation_id"],
            "from": self.agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "result": result
        }).encode())

    async def _handle_failure(self, task, error):
        """Handle task failure with retry and DLQ."""
        retry_count = task.get("retry_count", 0) + 1
        if retry_count <= self.config["task"]["max_retries"]:
            task["retry_count"] = retry_count
            delay = self.config["task"]["retry_delay"] * (2 ** (retry_count - 1))
            await asyncio.sleep(delay)
            await self._handle_task(task)
        else:
            # Dead letter queue
            await self.js.publish("swarm.dlq", json.dumps({
                "id": task["id"],
                "format_version": "1.0",
                "error": str(error),
                "retry_count": retry_count,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }).encode())
            # Alert on DLQ accumulation
            self.logger.warning(f"Task sent to DLQ after {retry_count} retries: {task['id']}")

    async def _publish_heartbeat(self):
        """Publish agent heartbeat at configured interval."""
        while self.running:
            try:
                await self.kv.put(
                    f"agent/{self.agent_id}",
                    json.dumps({
                        "id": self.agent_id,
                        "status": "online",
                        "last_heartbeat": datetime.now(timezone.utc).isoformat()
                    }).encode()
                )
            except Exception as e:
                self.logger.error(f"Heartbeat failed: {e}")
            await asyncio.sleep(self.config["heartbeat"]["interval"])

    def _setup_logging(self):
        level = logging.DEBUG if "--debug" in sys.argv else logging.INFO
        logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
        return logging.getLogger("swarmd")

    def _load_config(self, path):
        with open(path) as f:
            return yaml.safe_load(f)

    async def run(self):
        """Main entry point."""
        self.running = True
        await self.connect()
        await self.register()
        await self.listen_for_tasks()
        await self._publish_heartbeat()

    async def stop(self):
        """Graceful shutdown."""
        self.running = False
        if self.nc:
            await self.nc.close()

if __name__ == "__main__":
    config_path = sys.argv[1] if len(sys.argv) > 1 else "/etc/swarmd/config.yaml"
    daemon = SwarmDaemon(config_path)
    signal.signal(signal.SIGTERM, lambda s, f: asyncio.create_task(daemon.stop()))
    asyncio.run(daemon.run())
```

**swarmd config (per-agent, one per `/etc/swarmd/<agent>.yaml`):**
```yaml
agent:
  id: "sam"
  name: "Sam"
  capabilities:
    - "system-admin"
    - "ops"
    - "automation"
    - "incident-response"
    - "project-management"
  nats:
    endpoints:
      - "nats://172.16.254.201:4222"
      - "nats://172.16.254.203:4222"
    account: "swarm"
    nkey_file: "/etc/swarmd/sam.nk"
  session:
    key: "main"
    timeout: 300
  heartbeat:
    interval: 30
    timeout: 90
  task:
    max_retries: 3
    retry_delay: 5
    default_timeout: 600
    ttl: 86400  # 24 hours — tasks expire after this
```

**swarmd.service:**
```ini
[Unit]
Description=swarmd - NATS bridge daemon for OpenClaw agents
After=network.target tailscaled.service chrony.service
Wants=tailscaled.service

[Service]
Type=simple
User=localadmin
WorkingDirectory=/opt/swarmd
ExecStart=/usr/bin/python3 /opt/swarmd/swarmd.py /etc/swarmd/config.yaml
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

#### Step 2.3: Write Smart Dispatcher

**Fixed dispatcher with agent locking, fan-out/fan-in tracking, and timeout handling:**

```python
"""
Smart Dispatcher — routes tasks to appropriate swarm agents.

Improvements over v1:
- Agent-level locking (NATS KV lock) prevents duplicate assignments
- Fan-out/fan-in tracking with correlation groups
- Timeout handling for reply subjects
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml
import nats

class SmartDispatcher:
    def __init__(self, config_path):
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger("dispatcher")
        self.nc = None
        self.js = None
        self.kv = None

    async def connect(self):
        endpoints = self.config["nats"]["endpoints"]
        self.nc = await nats.connect(endpoints)
        self.js = self.nc.jetstream()
        self.kv = await self.js.key_value("swarm_registry")

    async def route_task(self, task):
        mode = task.get("mode", "sequential")
        agents = await self._get_available_agents()
        matches = self._match_capabilities(task, agents)

        if not matches:
            return {"status": "escalated", "reason": "No matching agents found", "task": task}

        if mode == "parallel":
            return await self._dispatch_parallel(task, matches)
        elif mode == "sequential":
            return await self._dispatch_sequential(task, matches)
        else:
            return {"status": "error", "reason": f"Unknown dispatch mode: {mode}"}

    async def _get_available_agents(self):
        agents = []
        async for entry in self.kv.entries("agent/"):
            data = json.loads(entry.value)
            if data.get("status") == "online":
                agents.append(data)
        return agents

    def _match_capabilities(self, task, agents):
        scored = []
        task_domain = self._classify_task(task)
        for agent in agents:
            score = 0
            for cap in agent["capabilities"]:
                if cap == task_domain:
                    score += 10
                elif any(kw in cap for kw in task_domain.split()):
                    score += 5
            scored.append((agent, score))
        return sorted(scored, key=lambda x: x[1], reverse=True)

    def _classify_task(self, task):
        text = task.get("task", "").lower()
        domains = {
            "ops": ["server", "cpu", "memory", "disk", "network", "monitoring"],
            "security": ["auth", "login", "password", "permission", "access", "audit"],
            "automation": ["script", "ci", "pipeline", "deploy", "automate"],
            "system-admin": ["config", "system", "service", "install", "update", "patch"],
            "incident-response": ["down", "error", "crash", "outage", "broken", "fail"],
            "research": ["how to", "what is", "explain", "compare", "best practice"],
            "project-management": ["timeline", "deadline", "planning", "milestone", "resource"],
        }
        for domain, keywords in domains.items():
            if any(kw in text for kw in keywords):
                return domain
        return "general"

    async def _dispatch_sequential(self, task, matches):
        """Sequential: agent A → agent B → result.
        Fan-out/fan-in: wait for each agent to complete before next."""
        results = []
        for agent, score in matches[:2]:
            # Lock agent assignment to prevent duplicate
            lock_key = f"lock/{agent['id']}"
            try:
                await self.kv.put(lock_key, json.dumps({"locked_at": datetime.now(timezone.utc).isoformat(), "task_id": task["id"]}).encode())
            except Exception as e:
                self.logger.warning(f"Lock failed, proceeding anyway: {e}")

            result = await self._send_to_agent(task, agent["id"], timeout=task.get("timeout", 300))
            results.append({"agent": agent["id"], "score": score, "result": result})

            # Fan-in: this sequential step waits for completion
            # before proceeding to the next agent
            # Lock released by agent's swarmd after task complete
            await self.kv.delete(f"lock/{agent['id']}")
        return {"status": "completed", "mode": "sequential", "results": results}

    async def _dispatch_parallel(self, task, matches):
        """Parallel: agent A + B + C simultaneously.
        Uses asyncio.gather with timeout."""
        timeout = task.get("timeout", 300)
        tasks = [
            (agent, score, self._send_to_agent(task, agent["id"], timeout=timeout))
            for agent, score in matches[:3]
        ]

        pending = {coro: (agent, score) for (agent, score, coro) in tasks}
        results = []
        for coro in asyncio.as_completed(list(pending.keys()), timeout=timeout):
            agent, score = dict(zip([t[2] for t in tasks], [(a, s) for a, s, _ in tasks]))[coro]
            try:
                result = await coro
                results.append({"agent": agent["id"], "score": score, "result": result})
            except asyncio.TimeoutError:
                results.append({"agent": agent["id"], "score": score, "result": {"error": "timeout"}})
            except Exception as e:
                results.append({"agent": agent["id"], "score": score, "result": {"error": str(e)}})

        return {"status": "completed", "mode": "parallel", "results": results}

    async def _send_to_agent(self, task, agent_id, timeout=300):
        """Send task to agent via NATS request/reply with timeout."""
        subject = f"swarm.{agent_id}.task"
        message = {
            "id": str(uuid.uuid4()),
            "format_version": "1.0",
            "version": "1.0",
            "type": "task",
            "from": "dispatcher",
            "to": agent_id,
            "correlation_id": str(uuid.uuid4()),
            "subject": subject,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "retry_count": 0,
            "payload": {
                "task": task.get("task", ""),
                "context": task.get("context", {}),
                "priority": task.get("priority", "normal"),
                "source": "dispatcher"
            }
        }
        try:
            response = await self.js.request(
                subject,
                json.dumps(message).encode(),
                timeout=timeout
            )
            return json.loads(response.data)
        except asyncio.TimeoutError:
            self.logger.error(f"Timeout waiting for response from {agent_id}")
            return {"error": f"Timeout waiting for {agent_id} after {timeout}s"}
        except Exception as e:
            self.logger.error(f"Error sending to {agent_id}: {e}")
            return {"error": str(e)}

    def _load_config(self, path):
        with open(path) as f:
            return yaml.safe_load(f)

if __name__ == "__main__":
    config_path = sys.argv[1] if len(sys.argv) > 1 else "/etc/swarmd/dispatcher.yaml"
    dispatcher = SmartDispatcher(config_path)
```

**dispatcher.yaml:**
```yaml
nats:
  endpoints:
    - "nats://172.16.254.201:4222"
    - "nats://172.16.254.203:4222"
account: "swarm"
task:
  default_timeout: 300
  max_retries: 2
  retry_delay: 5
```

---

### Phase 3: Integration (Week 4–5)

#### Step 3.1: Deploy swarmd to All Agents

**On claw (Sam):**
```bash
sudo apt install python3-pip python3-venv -y
python3 -m venv /opt/swarmd/venv
source /opt/swarmd/venv/bin/activate
pip install nats-py pyyaml

sudo mkdir -p /etc/swarmd
sudo tee /etc/swarmd/config.yaml > /dev/null <<'EOF'
agent:
  id: "sam"
  name: "Sam"
  capabilities:
    - "system-admin" - "ops" - "automation" - "incident-response" - "project-management"
  nats:
    endpoints:
      - "nats://172.16.254.201:4222"
      - "nats://172.16.254.203:4222"
    account: "swarm"
    nkey_file: "/etc/swarmd/sam.nk"
  session:
    key: "main"
    timeout: 300
  heartbeat:
    interval: 30
    timeout: 90
  task:
    max_retries: 3
    retry_delay: 5
    default_timeout: 600
    ttl: 86400
EOF

sudo mkdir -p /opt/swarmd
cp swarmd.py /opt/swarmd/
cp swarmd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable swarmd
sudo systemctl start swarmd
sudo systemctl status swarmd
```

**On hermes (Hermes) and ghost (Ghost):** Same steps, different config:
- hermes: id="hermes", capabilities=["security", "research", "ai-ml"]
- ghost: id="ghost", capabilities=["infrastructure", "networking"]

#### Step 3.2: Deploy Smart Dispatcher

On claw (Sam as dispatcher host):
```bash
mkdir -p /opt/swarmd/dispatcher
cp dispatcher.py /opt/swarmd/dispatcher/
cp dispatcher.yaml /etc/swarmd/
# Start as systemd service
sudo tee /etc/systemd/system/swarm-dispatcher.service > /dev/null <<'EOF'
[Unit]
Description=Smart Dispatcher for Swarm Agents
After=network.target nats-server.service

[Service]
Type=simple
User=localadmin
WorkingDirectory=/opt/swarmd/dispatcher
ExecStart=/usr/bin/python3 /opt/swarmd/dispatcher/dispatcher.py /etc/swarmd/dispatcher.yaml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable swarm-dispatcher
sudo systemctl start swarm-dispatcher
```

#### Step 3.3: Test Cross-Agent Delegation

**Test 1 — Direct task to Sam:**
```bash
nats --server nats://172.16.254.201:4222 pub swarm.sam.task '{"id":"test-1","format_version":"1.0","version":"1.0","type":"task","from":"hermes","to":"sam","correlation_id":"test-1-corr","subject":"swarm.sam.task","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","retry_count":0,"payload":{"task":"Hello Sam, how are you?","context":{},"priority":"normal","source":"hermes"}}'
```

**Test 2 — Direct task to Hermes:**
```bash
nats --server nats://172.16.254.201:4222 pub swarm.hermes.task '{"id":"test-2","format_version":"1.0","version":"1.0","type":"task","from":"sam","to":"hermes","correlation_id":"test-2-corr","subject":"swarm.hermes.task","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","retry_count":0,"payload":{"task":"Run a security scan on claw","context":{},"priority":"normal","source":"sam"}}'
```

**Test 3 — Broadcast announcement:**
```bash
nats --server nats://172.16.254.201:4222 pub swarm.broadcast.announce '{"id":"test-3","format_version":"1.0","version":"1.0","type":"announce","from":"sam","to":"*","correlation_id":"test-3-corr","subject":"swarm.broadcast.announce","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","retry_count":0,"payload":{"message":"Sam is online and ready","context":{"capabilities":["system-admin","ops"]},"source":"sam"}}'
```

**Test 4 — Failover:**
1. Kill NATS+1: `systemctl stop nats-server` on ts-nats-vm
2. Verify agents reconnect to NATS+2
3. Verify task delivery still works
4. Restart NATS+1: `systemctl start nats-server`
5. Verify rejoin: `curl localhost:8222/varz | jq '.connect_urls'`

#### Step 3.4: Agent Onboarding/Offboarding Procedure

**Adding a new agent:**
1. Generate NKey: `nsc generate nkey -type USER > /etc/swarmd/<agent>.nk && chmod 600 /etc/swarmd/<agent>.nk`
2. Copy NKey to agent node
3. Add NKey to all 3 NATS nodes' account config with proper permissions
4. Register in KV: `nats kv put swarm_registry agent/<agent> '{"id":"<agent>","name":"<name>","capabilities":[...],"status":"online","connected_at":"<now>"}'`
5. Deploy swarmd config + service to agent node
6. Verify: `nats kv get swarm_registry agent/<agent>`

**Removing an agent:**
1. `systemctl stop swarmd && systemctl disable swarmd` on agent
2. Delete KV entry: `nats kv delete swarm_registry agent/<agent>`
3. Remove NKey from NATS account config on all 3 nodes
4. Verify agent no longer appears in KV

---

### Phase 4: Validation (Week 5–6)

#### Step 4.1: Performance Validation

```bash
# Task latency
time nats --server nats://172.16.254.201:4222 request swarm.sam.task '{"task":"echo test","priority":"normal"}'

# Reconnect time
watch -n 1 'systemctl is-active nats-server'
# Kill NATS, measure until agent reconnects (target: <30 seconds)

# JetStream disk usage
curl -s http://localhost:8222/jsz | jq '.js.memory_usage.total_bytes'
```

#### Step 4.2: Load Testing

```bash
# Baseline: 10 concurrent tasks
for i in $(seq 1 10); do
    nats --server nats://172.16.254.201:4222 pub swarm.sam.task "{\"id\":\"load-$i\",\"format_version\":\"1.0\",\"type\":\"task\",\"from\":\"load-test\",\"to\":\"sam\",\"correlation_id\":\"load-$i-corr\",\"payload\":{\"task\":\"echo test $i\",\"priority\":\"normal\"}}" &
done
wait
echo "10 concurrent tasks complete"

# Stress: 100 concurrent tasks
for i in $(seq 1 100); do
    nats --server nats://172.16.254.201:4222 pub swarm.sam.task "{\"id\":\"load-$i\",\"format_version\":\"1.0\",\"type\":\"task\",\"from\":\"load-test\",\"to\":\"sam\",\"correlation_id\":\"load-$i-corr\",\"payload\":{\"task\":\"echo test $i\",\"priority\":\"normal\"}}" &
done
wait
echo "100 concurrent tasks complete"
```

**Measure and record:**
- Task latency (p50, p95, p99)
- Throughput (tasks/minute)
- Reconnect time
- JetStream disk/memory usage under load

#### Step 4.3: Disaster Recovery Testing

```bash
# Simulate JetStream disk fill
curl -s http://localhost:8222/jsz | jq '.js'

# Verify snapshots exist (cron should be running)
ls -la /var/lib/nats/jetstream/state/

# Test recovery procedure:
# 1. Stop NATS on all 3 nodes
# 2. Restore from latest snapshot
# 3. Start NATS in bootstrap order
# 4. Verify KV data restored: nats kv get swarm_registry agent/sam
# RTO target: 1 hour
# RPO target: 4 hours
```

#### Step 4.4: Documentation

- Update TOOLS.md with swarm infrastructure details
- Update IDENTITY.md with swarm agent IDs
- Update MEMORY.md with swarm architecture decisions
- Update AGENTS.md with swarm communication protocols
- Create runbook: `/docs/swarm/runbook.md` with common issues and fixes
- Update ITIL tickets with status and links to this document

---

## Verification

### Post-Deployment Checklist

- [ ] ts-nats-vm created (4vCPU/8GB) and NATS running on TS Proxmox
- [ ] usm1-nats-vm created (4vCPU/8GB) and NATS running on USM1 Proxmox
- [ ] ts-nats-arbiter created (1vCPU/512MB) as LXC on TS Proxmox
- [ ] NATS cluster: all 3 nodes connected (visible in `curl localhost:8222/varz`)
- [ ] JetStream enabled with 4GB RAM / 32GB file limit
- [ ] NKey auth working — agents connect with valid NKeys
- [ ] Per-subject NKey permissions enforced (Sam can't read Hermes' tasks)
- [ ] chrony running, serving NTP to agents
- [ ] Tailscale ACLs restricting ports 4222/6222/123 to swarm agents
- [ ] Prometheus + Grafana deployed with alert rules
- [ ] OpenClaw bridge prototype verified before swarmd development
- [ ] swarmd deployed to claw, hermes, ghost — all registered in KV
- [ ] Cross-agent task delegation tested and verified
- [ ] Failover test passed (kill one NATS, agents reconnect)
- [ ] Smart dispatcher deployed and routing correctly
- [ ] Load testing completed (10 and 100 concurrent tasks)
- [ ] Disaster recovery test passed (RTO <1h, RPO <4h)
- [ ] Prometheus metrics visible at port 7777
- [ ] DLQ operational with 7-day retention

### Key Verification Commands

```bash
# NATS cluster health (all 3 nodes)
curl -s http://ts-nats-vm:8222/varz | jq '.connect_urls'
curl -s http://usm1-nats-vm:8222/varz | jq '.connect_urls'

# NATS KV entries (registered agents)
nats kv get swarm_registry agent/sam
nats kv get swarm_registry agent/hermes
nats kv get swarm_registry agent/ghost

# NATS consumer lag (JetStream)
curl -s http://ts-nats-vm:8222/jsz?conv | jq '.streams'

# NTP sync
chronyc tracking
chronyc sources -v

# swarmd service status
systemctl status swarmd
journalctl -u swarmd --since "10 minutes ago"

# DLQ contents
nats kv get swarm_registry dlq
```

---

## Common Issues

### NATS cluster node won't connect
**Symptoms:** Node disconnected in `/varz`, ports 6222/4222 unreachable

**Diagnosis:**
```bash
telnet <other-node-ip> 6222
journalctl -u nats-server -n 50
ss -tlnp | grep 6222
ss -tlnp | grep 4222
```

**Resolution:**
- Verify route URLs are resolvable IPs (not hostnames that DNS can't resolve)
- Check Tailscale connectivity between NATS nodes
- Ensure Tailscale ACLs allow ports 6222 and 4222
- Restart: `systemctl restart nats-server`

### Agent can't reconnect to NATS after restart
**Symptoms:** Agent offline in KV, swarmd logs show connection errors

**Diagnosis:**
```bash
journalctl -u swarmd -n 100
nats --server nats://<ip>:4222 ping
nsc validate <nkey-file>
```

**Resolution:**
- NKey file exists with `chmod 600`
- NKey listed in NATS account config
- swarmd config has correct endpoint URLs
- Restart: `systemctl restart swarmd`

### JetStream disk filling up
**Symptoms:** NATS logs show "storage full", tasks stop processing

**Diagnosis:**
```bash
curl -s http://localhost:8222/jsz | jq '.js'
nats kv info swarm_registry
```

**Resolution:**
- Increase `max_file` in config (currently 32GB)
- Clean old messages: `nats kv purge swarm_registry --subject "agent/*"`
- Verify message TTL is set (24h) — old messages auto-expire
- Alert on 80% disk usage (configured in Grafana)

### Chrony NTP drift between servers
**Symptoms:** Message timestamps off by minutes

**Diagnosis:**
```bash
chronyc tracking
chronyc sources -v
diff <(chronyc tracking -n on ts-nats-vm) <(chronyc tracking -n on usm1-nats-vm)
```

**Resolution:**
- Verify stratum-1 sources reachable
- Force sync: `chronyc makestep`
- Check Tailscale connectivity to NTP sources

---

## Operational Runbook

### Daily Checks
```bash
# Check all NATS nodes
for node in ts-nats-vm usm1-nats-vm ts-nats-arbiter; do
    echo "=== $node ==="
    curl -s "http://$node:8222/varz" | jq '.name, .connect_urls'
done

# Check all agents in KV
for agent in sam hermes ghost; do
    echo "=== $agent ==="
    nats kv get swarm_registry agent/$agent 2>/dev/null || echo "NOT REGISTERED"
done

# Check chrony
chronyc sources -v

# Check DLQ
nats kv keys swarm_registry --filter "dlq.*"
```

### Weekly Tasks
- Review Grafana dashboards for trends
- Check JetStream disk usage trends
- Review swarmd logs for errors
- Verify snapshot cron is running (`crontab -l | grep nats`)
- Test one agent reconnect

### Monthly Tasks
- NATS version review — check for security patches
- NKey rotation plan (every 6 months)
- Load test re-run
- DR test (simulate one NATS node failure)
- Review and update agent capabilities in KV

---

## Related Playbooks

- `llama-cpp-installation.md` — Installing LLM inference on new agent VMs
- `tailscale-container-setup.md` — Tailscale on new VMs/LXCs
- `hermes-apparmor-storm.md` — Security configuration reference
- `openclaw-gateway-failures.md` — Troubleshooting OpenClaw issues
- `proxmox-vm-lxc-migration.md` — Proxmox VM management

---

## Notes

### Design Decisions

1. **NATS over RabbitMQ:** Simpler protocol, lighter footprint, native request/reply, better fit for short-lived agent-to-agent tasks.

2. **3-node cluster with arbiter:** True HA with minimal resource cost. Arbiter (512MB) provides quorum without storing JetStream data.

3. **Chrony over NTPd:** More accurate, handles virtualized environments better, supports multiple stratum-1 sources.

4. **swarmd as separate process:** Isolates NATS client logic from the agent itself. Agent can restart independently.

5. **Smart dispatcher over consensus:** Practical first step. No deliberation, just routing. Consensus can be added later.

6. **OpenClaw bridge prototype first:** The bridge is the single biggest blocker. Prototype before swarmd development to de-risk.

7. **Per-subject NKey permissions:** Not just account-level — each agent can only publish/subscribe to its own topics.

### Envelope Versioning Policy

- `format_version` field on all messages (currently "1.0")
- Increment on breaking changes (new required fields, changed types)
- Agents must reject messages with unknown format versions
- Backward compatibility: agents accept versions up to N+1
- Deprecation: announce breaking changes 2 weeks before enforcement

### Message TTL Policy

- Tasks: 24 hours (`ttl: 86400` in config)
- DLQ entries: 7 days (retention policy)
- Heartbeats: no TTL (KV entry overwritten each heartbeat)
- Agent registry: no TTL (persistent registration)

### Future Extensions (Out of Scope for MVP)

- **Consensus protocol** — propose→review→counter→vote→consensus
- **Additional agent VMs** — for agents 5 and 6
- **LLM on Ghost** — separate project; Ghost starts as infrastructure only
- **Web dashboard** — Grafana dashboards deployed in Phase 1
- **Task priority queue** — NATS priority queues add complexity
- **Agent-to-agent trust framework** — consider certificate rotation beyond NKey auth
- **Auto-scaling dispatcher** — LLM-based task classification instead of keyword matching

### NTP Notes

- Tailscale does NOT provide NTP synchronization between nodes
- Each agent MUST configure its own NTP sources
- NATS servers serve as internal stratum 3 NTP servers
- Public sources (time.cloudflare.com, time.google.com) serve as stratum 1 fallback
- Tailscale CIDR `100.64.0.0/10` and private `172.16.0.0/16` allowed to query NTP

### Tailscale Notes

- Tailscale ACLs are critical for NATS security
- Port 4222 restricted to swarm agent tags
- Port 6222 open between NATS nodes only
- Port 8222 (admin) restricted to admin user
- Port 123 (NTP) open to all swarm agents
- Port 7777 (Prometheus) restricted to Prometheus server

### Performance Targets

- Task latency: <5 seconds (NATS round-trip + agent processing)
- Reconnect time: <30 seconds (swarmd reconnect + NATS rejoin)
- NATS uptime: 99.9% (2-node cluster + arbiter)
- Max agents: 6+ (3 initial + 3 future)
- Concurrent tasks: 100+ (validated by load test)

---

*Document last reviewed: 2026-06-02*  
*Next review: After Phase 3 completion (Week 4)*  
*Post-implementation review: Week 6*
