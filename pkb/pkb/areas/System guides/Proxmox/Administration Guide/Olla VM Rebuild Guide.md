# Olla VM Rebuild Guide (usm2)

**Purpose:** Recreate Olla on usm2 with GPU passthrough and Ubuntu 24.04 using a fully remote, repeatable flow.

## Requirements
- Proxmox host: **usm2**
- VMID: **100**
- Specs: **8 vCPU / 8GB RAM / 512GB disk**
- Machine: **q35**
- BIOS: **OVMF (UEFI)** with **Secure Boot OFF** (no pre‑enrolled keys)
- GPU: **RTX 3090 passthrough** (secondary display, x-vga=0)
- OS: **Ubuntu 24.04 (cloud image)**
- User: **localadmin** / **11imistest**
- Network: **Static 172.16.254.100/24**
  - GW: **172.16.254.1**
  - DNS: **8.8.8.8**

---

## 1) Identify GPU PCI IDs
```bash
lspci -nn | grep -i nvidia
# Example (usm2):
# 81:00.0 VGA compatible controller [0300]: NVIDIA Corporation GA102 [10de:2204]
# 81:00.1 Audio device [0403]: NVIDIA Corporation GA102 High Definition Audio Controller [10de:1aef]
```

---

## 2) Create VM (Q35 + OVMF, Secure Boot OFF)
```bash
qm destroy 100 || true
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

---

## 3) Add GPU passthrough (secondary)
```bash
qm set 100 --hostpci0 81:00,pcie=1,x-vga=0
```

---

## 4) Remote Install via Ubuntu 24.04 Cloud Image (Option A)
```bash
IMG=/var/lib/vz/template/iso/ubuntu-24.04-server-cloudimg-amd64.img
wget -O "$IMG" https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

qm stop 100 || true
qm disk unlink 100 --idlist scsi0 --force || true
qm disk import 100 "$IMG" local-lvm
qm set 100 --scsi0 local-lvm:vm-100-disk-1
qm resize 100 scsi0 512G
qm set 100 --ide2 local-lvm:cloudinit
qm set 100 --ciuser localadmin --cipassword '11imistest'
qm set 100 --ipconfig0 ip=172.16.254.100/24,gw=172.16.254.1
qm set 100 --nameserver 8.8.8.8
qm set 100 --boot order=scsi0
qm start 100
```

---

## 5) Update OS + Install NVIDIA/CUDA
```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y nvidia-driver-535 nvidia-cuda-toolkit
sudo reboot
```

Verify after reboot:
```bash
nvidia-smi
```

---

## 6) Snapshot
```bash
qm shutdown 100 --timeout 120
qm snapshot 100 post-cuda-setup \
  --description "Ubuntu 24.04 cloud image, static IP 172.16.254.100, localadmin user, NVIDIA 535 driver + CUDA toolkit installed, GPU passthrough configured (secondary), ready for use."
qm start 100
```

---

## Notes
- Keep `x-vga=0` so console remains visible.
- Do not enroll UEFI keys (Secure Boot must stay OFF).
- Cloud image avoids manual install and supports repeatable provisioning.
