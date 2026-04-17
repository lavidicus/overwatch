# System Administration Knowledge Base (Updated)

> Index of system administration topics covered in this PKB

**Last Updated:** 2026-04-04
**Total Notes:** 141+

---

## 🐧 Linux/Unix Systems

### Containerization & Virtualization
- [[Docker Containers]] — Container management, resource allocation
- [[NVIDIA GRID Virtualization]] — GPU passthrough, VGPU configuration
- [[Proxmox Virtualization]] — LXC containers, VMs, cluster management

### Storage Systems
- [[ZFS Filesystem]] — ZFS tuning, dataset management
- [[GlusterFS]] — Distributed storage, replica/distributed modes
- [[NFS & CIFS/Samba]] — Network file sharing

### Network Security
- [[Linux Firewalld]] — Zone management, direct rules
- [[IPSEC]] — Site-to-site VPN, PSK authentication
- [[Fail2Ban]] — Intrusion prevention

### System Administration
- [[Linux Server Builds]] — Red Hat, Ubuntu server setup
- [[LVM Management]] — Logical volumes, volume groups
- [[Time Synchronization]] — Chrony, NTP

---

## 🪟 Microsoft/Windows Systems

### Windows Server
- [[Active Directory]] — Domain management, user administration
- [[Windows Server Licensing]] — Product keys, evaluation periods
- [[DISM]] — Deployment Image Servicing and Management
- [[CIS Benchmarks]] — Security hardening

### Windows Client
- [[Windows 10 Administration]] — Product keys, activation
- [[Windows Subsystem for Linux]] — WSL setup and configuration
- [[PowerShell Administration]] — Automation, remote management

### Windows Security
- [[Windows Firewall]] — Zone configuration, RDP access
- [[Windows Power Options]] — Performance tuning

---

## 🏗️ Proxmox VE

### Core Operations
- [[PVE System Configuration]] — Host setup, repository management
- [[PVE Storage Management]] — ZFS, Ceph, iSCSI configuration
- [[PVE Migration]] — LXC and VM migration between hosts

### Advanced Features
- [[PVE NVIDIA Guides]] — GPU passthrough, kernel pinning
- [[PVE Custom Scripts]] — Automation, service management
- [[PVE Container Apps]] — Application deployment templates

### Hosts
- **usm1** (REMOVED 2026-04-04) — 172.16.254.230, NVIDIA VGPU, kernel 6.5.x pinned
- **usm2** (Proxmox host) — 172.16.254.231, RTX 3090, kernel 6.17.9-1
  - **VM 101 (olla)** — llama.cpp server running on usm2
- **dc** — Domain controller (if applicable)

---

## 🗄️ Database Systems

- [[PostgreSQL]] — Installation, configuration, Django integration

---

## 📡 Networking

### Hardware
- [[Cisco 2960X Switch]] — Layer 2 switch configuration
- [[PepWave MaxBR1]] — Router configuration

### Protocols
- [[IPSEC VPN]] — Site-to-site connectivity
- [[DNS/BIND9]] — DNS server configuration

---

## 🤖 AI & Machine Learning

### Inference Servers
- [[llama.cpp Server — Olla]] — Primary LLM inference (VM 101 on usm2, RTX 3090)
- [[Ollama]] — Local LLM inference (legacy, replaced by llama.cpp)
- [[Open-WebUI]] — Web interface for LLMs

### Models
- **Qwen3.5** — Primary model family (27B, 35B variants)
- **Gemma 4** — Added 2026-04-02
- **LLaMA 3.x** — Supported

### Frameworks
- **llama.cpp** — C++ inference server (OpenAI-compatible API)
- **gguf** — Model format (quantized)

---

## 📻 Radio & Communications

- [[GMRS/FCC Licensing]] — FRN registration, license application
- [[GMRS Frequency Information]] — Channel allocations, power limits

---

## 🔧 Hardware Reference

### Servers
- [[Supermicro X9DRi-LN4F]] — 1U server, motherboard specs
- [[HP ProLiant EC200a]] — Blade server, battery info
- **RTX 3090** — 24GB VRAM, running on ollam VM (usm2)

### Power
- [[APC Smart-UPS]] — UPS management

---

## 🔗 Cross-References

### Related ITIL Playbooks
- `../ITIL/playbooks/proxmox-ha-cluster.md` — Proxmox HA configuration
- `../ITIL/playbooks/proxmox-backup-restore.md` — Backup procedures
- `../ITIL/playbooks/proxmox-storage-management.md` — Storage operations
- `../ITIL/playbooks/ubuntu-pin-kernel-6.5.11.md` — Kernel pinning (NVIDIA)
- `../ITIL/playbooks/llama-cpp-rebuild-upgrade.md` — llama.cpp rebuild procedure

### OpenClaw Integration
- `../../memory/` — Session logs and decisions
- `../../MEMORY.md` — Curated long-term memory (16KB)
- `../../openclaw.json` — Gateway configuration
- `../ITIL/` — Issue tracking and reports

### External Services
- **n8n** — Workflow automation (`http://ocg.9xc.local:5678`)
- **Matrix** — Messaging (`@sam:comms.9xc.io`)
- **Synapse** — Matrix homeserver (`comms.9xc.local`)

---

## 📊 Statistics

| Category | Notes |
|----------|-------|
| Linux/Unix | ~50 |
| Microsoft/Windows | ~25 |
| Proxmox | ~25 |
| Networking | ~10 |
| Database | ~5 |
| AI/ML | ~8 (updated 2026-04-04) |
| Radio | ~7 |
| Hardware | ~10 |
| **Total** | **141+** |

---

## 🔄 Recent Changes (2026-04-04)

- **usm1 removed** — Host removed from network (NVIDIA VGPU dependency)
- **usm2 confirmed** — Proxmox host (172.16.254.231) still active
- **olla = VM 101** — VM running on usm2, hosts llama.cpp server
- **Ollama replaced** — Using llama.cpp server instead
- **Memory trimmed** — MEMORY.md reduced to 16KB (removed usm2 SSH, Signal groups, Identity/Setup)

---

*Generated: 2026-03-07 | Updated: 2026-04-04 by Sam (OpenClaw)*
