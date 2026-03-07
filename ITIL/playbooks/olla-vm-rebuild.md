# Olla VM Rebuild (usm2) — Playbook

**Category:** Change / Recovery
**Priority:** P1
**Scope:** usm2 Proxmox host

## Goal
Recreate the Olla VM (VMID 100) with GPU passthrough and Ubuntu 24.04, after accidental removal. Keep console visible, Secure Boot off, and provision user `localadmin`.

## Current Requirements (as of 2026‑03‑07)
- **VMID:** 100
- **Name/Hostname:** `olla`
- **CPU/RAM:** 8 cores / 8GB
- **Disk:** 512GB (SSD / local-lvm)
- **Machine:** q35
- **BIOS:** OVMF (UEFI) **without** pre‑enrolled keys (Secure Boot OFF)
- **Display:** default (console visible)
- **GPU:** NVIDIA 3090 passthrough, **not primary display** (`x-vga=0`)
- **OS:** Ubuntu 24.04
- **User:** localadmin / `11imistest`

---

## Checklist

### 1) Verify GPU PCI IDs
```bash
lspci -nn | grep -i nvidia
# Expected:
# 81:00.0 VGA compatible controller [0300]: NVIDIA Corporation GA102 [10de:2204]
# 81:00.1 Audio device [0403]: NVIDIA Corporation GA102 [10de:1aef]
```

### 2) Create VM (Q35 + OVMF, no Secure Boot)
```bash
qm create 100 \
  --name 'olla' \
  --machine q35 \
  --bios ovmf \
  --efidisk0 local-lvm:0,format=raw \
  --scsihw virtio-scsi-pci \
  --scsi0 local-lvm:512 \
  --cores 8 \
  --memory 8192 \
  --net0 virtio,bridge=vmbr0 \
  --boot order=scsi0 \
  --serial0 socket \
  --cpu host \
  --vga std
```

### 3) Add GPU passthrough (secondary)
```bash
qm set 100 --hostpci0 81:00,pcie=1,x-vga=0
```

### 4) Install OS (Remote Option A — Cloud Image)
**Goal:** Fully remote install using Ubuntu 24.04 cloud image + cloud-init.

```bash
IMG=/var/lib/vz/template/iso/ubuntu-24.04-server-cloudimg-amd64.img
wget -O "$IMG" https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

qm stop 100 || true
qm disk unlink 100 --idlist scsi0 --force || true
qm disk import 100 "$IMG" local-lvm
qm set 100 --scsi0 local-lvm:vm-100-disk-1
qm resize 100 scsi0 512G
qm set 100 --ide2 local-lvm:cloudinit
qm set 100 --ciuser localadmin --cipassword '11imistest' --ipconfig0 ip=dhcp
qm set 100 --boot order=scsi0
```

### 5) Start VM
```bash
qm start 100
```

---

## Progress Log

### 2026‑03‑07
- Confirmed usm2 Proxmox VE 9.1.5
- ISO found: `/var/lib/vz/template/iso/proxmox-ve_9.1-1.iso`
- Original PVE VM created then re‑created as VMID 200
- VMID 100 rebuilt as **olla** (q35 + OVMF + 8c/8GB + 512G + GPU passthrough)
- Cloud image path used:
  - `/var/lib/vz/template/iso/ubuntu-24.04-server-cloudimg-amd64.img`
- Cloud‑init configured:
  - user: `localadmin`
  - password: `11imistest`
  - DHCP enabled
- VMID 100 started

## 2026‑03‑07 21:08 UTC
- User suspects DHCP IP is likely `.85` (unconfirmed)
- User corrected IP to **172.16.254.78** (current DHCP)
- Target static IP: **172.16.254.100/24** (GW 172.16.254.1, DNS 8.8.8.8)
- Applied cloud-init static IP and rebooted VM

---

## Validation
- [ ] VM boots successfully
- [ ] Console visible (non‑GPU primary)
- [ ] User login works: `localadmin / 11imistest`
- [ ] DHCP IP obtained (record it)
- [ ] `nvidia-smi` works inside guest

---

## Notes / Gotchas
- **Do not** set GPU as primary display (keep `x-vga=0`)
- **Do not** enroll UEFI keys (Secure Boot must be OFF)
- Cloud image install avoids manual UI; ensures remote setup

---

## Next Steps
- Retrieve VM IP (guest agent / console / ARP scan)
- Install NVIDIA driver inside guest
- Add QEMU guest agent in guest
- Lock in static IP if needed
