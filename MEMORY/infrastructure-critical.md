# Critical Infrastructure Notes

## 🦙 llama.cpp Location (CRITICAL - NEVER FORGET)

**Node:** `node1`  
**SSH:** `ssh localadmin@node1`  
**Service:** llama-server (llama.cpp)

**NEVER check TS, olla, or any other host for llama.cpp - it's on node1.**

This is the single source of truth for the LLM inference server. All llama-server status, logs, and model operations go through node1.

---

## 🖥️ TS (ts.9xc.local) - Proxmox Host

**IP:** 172.16.254.5  
**SSH:** `ssh root@ts.9xc.local`  
**Hardware:** Supermicro SYS-6028R-T-2-TR013  
**CPU:** 2× Xeon E5-2680 v4 (28 cores / 56 threads total)  
**RAM:** 251 GB  
**Storage:**  
- **HDD (4× 10TB):** ST10000NM0086/ST10000NM0126/ST10000NM0046 (7200 rpm SAS)  
- **SSD (2× 2TB):** Intel P3-2TB mSATA  
- **NVMe (4× 1TB):** Crucial P3 CT1000P3PSSD8  
**GPU:** 2× Quadro P6000 (in VM 100)

### VMs/LXCs on TS

**Running VMs:**
- **VM 100 - NODE1** (Ubuntu 24.04, running)
  - Status: running (PID 3564)
  - Memory: 64 GB
  - Boot disk: 128 GB (FAST:vm-100-disk-0)
  - Cores: 28 (2 sockets × 14 cores)
  - BIOS: OVMF (UEFI)
  - CPU: host mode passthrough
  - GPU Passthrough: 2× P6000 (hostpci0: 0000:81:00, hostpci1: 0000:82:00)
  - Network: virtio (BC:24:11:62:BE:5D), bridge=vmbr0, firewall enabled
  - NUMA: enabled (node0)
  - On-boot: yes
  - IP: 172.16.254.100
  - Storage: 128GB SSD on fast-store pool
  - Hardware: virtio-scsi-single controller

**LXCs:** None configured

### Storage Details (TS Host)

**HDDs (4× 10TB Enterprise):**
- **/dev/sda** - ST10000NM0086-2AA101, SN: ZA21FE2N, 10TB, 7200rpm
  - Power On Hours: 21,525 (70+ years equiv)
  - Reallocated Sectors: 8
  - Pending Sectors: 0
  - Uncorrectable: 0
  - Temp: 37°C
- **/dev/sdb** - ST10000NM0126-1TT131, SN: ZA2DYRC3, 10TB, 7200rpm
  - Power On Hours: 13,192
  - Reallocated Sectors: 0
  - Temp: 37°C
- **/dev/sdc** - ST10000NM0046, SN: ZA22PC0Y, 10TB, 7200rpm
  - Power On Hours: 13,163
  - Reallocated Sectors: 0
  - Temp: 35°C
- **/dev/sdd** - ST10000NM0086-2AA101, SN: ZA21CCQ7, 10TB, 7200rpm
  - Power On Hours: 21,520
  - Reallocated Sectors: **36,704** ⚠️ (WARNING - failing drive)
  - Reported Uncorrectable: 10 ⚠️
  - Temp: 36°C
  - **STATUS: REQUIRES REPLACEMENT - High reallocated sector count**

**SSDs (2× 2TB Intel P3 mSATA):**
- **/dev/sde** - Intel P3-2TB, SN: 0029270011253, 2.04TB, mSATA
- **/dev/sdf** - Intel P3-2TB, SN: 0029270021566, 2.04TB, mSATA

**NVMe SSDs (4× 1TB Crucial P3):**
- **/dev/nvme0n1** - CT1000P3PSSD8, SN: 25074E3D3728, 1TB, NVMe 1.4
- **/dev/nvme1n1** - CT1000P3PSSD8, SN: 25074E3C0EF9, 1TB, NVMe 1.4
- **/dev/nvme2n1** - CT1000P3PSSD8, SN: 25074E3D3773, 1TB, NVMe 1.4
- **/dev/nvme3n1** - CT1000P3PSSD8, SN: 25074E3CACB3, 1TB, NVMe 1.4

---

## 🐧 NODE1 - Ubuntu 24.04 Server (VM 100 on TS)

**IP:** 172.16.254.100  
**SSH:** `ssh localadmin@node1`  
**OS:** Ubuntu 24.04.4 LTS (Noble Numbat)  
**Kernel:** Linux 6.8.0-107-generic x86_64  
**CPU:** Intel Xeon E5-2680 v4 @ 2.40GHz (28 cores, 1 thread/core)  
**RAM:** 62 GB total (56 GB available)  
**Swap:** 8 GB  
**Root FS:** 123 GB (54 GB used, 54% utilized)

### GPUs (Passthrough from TS)
- **GPU 0:** Quadro P6000, 24 GB VRAM (21.9 GB used, 2.4 GB free)
- **GPU 1:** Quadro P6000, 24 GB VRAM (19.9 GB used, 4.5 GB free)
- **Total VRAM:** 48 GB

### CPU (hosted on TS but assigned to VM)
- **Model:** Intel Xeon E5-2680 v4 @ 2.40GHz
- **Cores:** 28 (2 sockets × 14 cores)
- **Threads:** 28 (1 thread/core)
- **NUMA:** node0

### Active Services (llama-server)
- **Service:** `llama-server.service` (enabled, running since 23:17:38 UTC)
- **PID:** 1513
- **Memory:** 4.7 GB (peak 4.7 GB)
- **Model:** `/opt/models/gguf/llamacpp.gguf`
- **Port:** 11434 (host 0.0.0.0)
- **Context:** 262,144 tokens
- **GPU layers:** 99 (full offload)
- **Threads:** 28
- **Batch size:** 1024 (ubatch: 512)
- **KV cache:** Q8_0 for both K and V
- **Metrics:** enabled
- **Reasoning:** off

### Performance (recent request)
- **Prompt processing:** 1,247 ms (475 tokens, 380.84 tok/s)
- **Eval:** 1,269 ms (50 tokens, 39.40 tok/s)
- **Total:** 2,516 ms (525 tokens)

---

*Updated: 2026-04-12 23:33 UTC*

**Note:** llama.cpp is ONLY on node1. TS hosts the VM, but all inference happens on node1 inside the VM.

## Other Infrastructure Quick Reference

- **TS (ts.9xc.local):** 172.16.254.5 - Proxmox ESXi, formerly USM1/USM2, 2× P6000 GPUs, 251GB RAM
- **Olla (oc.9xc.local):** 172.16.254.100 - llama.cpp was previously here (DEPRECATED)
- **ocg (ocg.9xc.local):** 172.16.254.101 - n8n server
- **Home Server:** 192.168.1.100 - admin user

---

*Written: 2026-04-12 23:24 UTC*
