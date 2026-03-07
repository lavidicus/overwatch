# Proxmox LXC GPU Passthrough

## Overview

Playbook for configuring NVIDIA GPU passthrough to LXC containers, including device identification, configuration, and troubleshooting.

---

## 1) Pre-Change Checklist

### Required

- Proxmox host with NVIDIA GPU installed
- NVIDIA drivers installed on host
- SSH/console access
- Container should be stopped during configuration

### Identify GPU and Devices

```bash
# List NVIDIA devices and capture major/minor numbers
ls -l /dev/nvidia*

# Example output:
# crw-rw-rw- 1 root root 195, 0 May 15 10:00 /dev/nvidia0
# crw-rw-rw- 1 root root 195, 255 May 15 10:00 /dev/nvidactl
# crw-rw-rw- 1 root root 195, 254 May 15 10:00 /dev/nvidia-modeset
# crw-rw-rw- 1 root root 236, 0 May 15 10:00 /dev/nvidia-uvm
# crw-rw-rw- 1 root root 236, 1 May 15 10:00 /dev/nvidia-uvm-tools

# List DRI/render devices
ls -l /dev/dri/

# Example output:
# crw-rw-rw- 1 root video 226, 128 May 15 10:00 renderD128

# Check render/video group GID
groupinfo render
groupinfo video

# Example: GID 105
```

---

## 2) Configure GPU Passthrough

### Edit LXC Container Configuration

```bash
# Backup container config
sudo cp /etc/pve/lxc/<CTID>.conf /etc/pve/lxc/<CTID>.conf.backup.$(date +%Y%m%d)

# Edit container config
sudo vim /etc/pve/lxc/<CTID>.conf
```

### Add GPU Configuration

Append to container config file:

```conf
# NVIDIA GPU device access (update numbers from your system)
lxc.cgroup2.devices.allow: c 195:* rwm  # NVIDIA devices
lxc.cgroup2.devices.allow: c 236:* rwm  # NVIDIA UVM
lxc.cgroup2.devices.allow: c 226:128 rwm  # DRI/render device

# Mount NVIDIA devices into container
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file 0 0
lxc.mount.entry: /dev/nvidactl dev/nvidactl none bind,optional,create=file 0 0
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file 0 0
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file 0 0
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file 0 0
lxc.mount.entry: /dev/dri/renderD128 dev/dri/renderD128 none bind,optional,create=file 0 0

# Map render/video group GID
lxc.idmap: g 105 105 1  # Map host GID 105 to container GID 105
```

**⚠️ Important:** Replace major/minor numbers with values from your system!

---

## 3) Restart Container

```bash
# Stop container
pct stop <CTID>

# Start container
pct start <CTID>

# Or restart
pct restart <CTID>
```

---

## 4) Verify GPU Passthrough

### Inside Container

```bash
# SSH into container
pct enter <CTID>

# Check NVIDIA devices available
ls -l /dev/nvidia*

# Check render device
ls -l /dev/dri/renderD*

# If nvidia-smi is installed
nvidia-smi

# Check PCI devices (if lspci available)
lspci | grep -i nvidia
```

### Expected Output

```
/dev/nvidia0
/dev/nvidactl
/dev/nvidia-modeset
/dev/nvidia-uvm
/dev/nvidia-uvm-tools
/dev/dri/renderD128
```

---

## 5) Install NVIDIA Drivers Inside Container

```bash
# Debian/Ubuntu container
apt update
apt install -y nvidia-utils-<driver_version>

# Verify
dpkg -l | grep nvidia
```

---

## 6) Troubleshooting

### Devices Not Visible in Container

```bash
# Check container config
pct config <CTID> | grep -E "nvidia|cgroup2|mount.entry"

# Check host devices exist
ls -l /dev/nvidia*

# Check container is privileged (may be required)
pct config <CTID> | grep unprivileged

# If unprivileged, consider:
pct set <CTID> -unprivileged 0
```

### Permission Denied Errors

```bash
# Verify GID mapping
pct config <CTID> | grep idmap

# Check group membership on host
getent group render
getent group video

# Verify container can access devices
pct enter <CTID>
cat /sys/fs/cgroup/cgroup.controllers
```

### GPU Not Detected by Applications

```bash
# Inside container, check environment
env | grep -i nvidia

# Set if needed
export NVIDIA_VISIBLE_DEVICES=all
export NVIDIA_DRIVER_CAPABILITIES=all

# Verify driver loaded
dmesg | grep -i nvidia
```

---

## 7) Rollback

```bash
# Stop container
pct stop <CTID>

# Restore config from backup
sudo cp /etc/pve/lxc/<CTID>.conf.backup.* /etc/pve/lxc/<CTID>.conf

# Start container
pct start <CTID>

# Verify GPU devices removed from container
pct enter <CTID>
ls -l /dev/nvidia*  # Should fail/not exist
```

---

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE NVIDIA Guides/Proxmox LXC Container GPU Passthrough]]

---

*Created: 2026-03-07 | Priority: P2 | Category: Change Management*
