# System Administration Knowledge Base

> Index of system administration topics covered in this PKB

**Last Updated:** 2026-03-07
**Total Notes:** 141

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

- [[Ollama]] — Local LLM inference
- [[Open-WebUI]] — Web interface for LLMs

---

## 📻 Radio & Communications

- [[GMRS/FCC Licensing]] — FRN registration, license application
- [[GMRS Frequency Information]] — Channel allocations, power limits

---

## 🔧 Hardware Reference

### Servers
- [[Supermicro X9DRi-LN4F]] — 1U server, motherboard specs
- [[HP ProLiant EC200a]] — Blade server, battery info

### Power
- [[APC Smart-UPS]] — UPS management

---

## 🔗 Cross-References

### Related ITIL Playbooks
- `../ITIL/playbooks/proxmox-ha-cluster.md` — Proxmox HA configuration
- `../ITIL/playbooks/proxmox-backup-restore.md` — Backup procedures
- `../ITIL/playbooks/proxmox-storage-management.md` — Storage operations
- `../ITIL/playbooks/ubuntu-pin-kernel-6.5.11.md` — Kernel pinning (NVIDIA)

### OpenClaw Memory
- `../../memory/` — Session logs and decisions
- `../../MEMORY.md` — Curated long-term memory

---

## 📊 Statistics

| Category | Notes |
|----------|-------|
| Linux/Unix | ~50 |
| Microsoft/Windows | ~25 |
| Proxmox | ~25 |
| Networking | ~10 |
| Database | ~5 |
| AI/ML | ~5 |
| Radio | ~7 |
| Hardware | ~10 |
| **Total** | **141** |

---

*Generated: 2026-03-07 by Sam (OpenClaw)*
