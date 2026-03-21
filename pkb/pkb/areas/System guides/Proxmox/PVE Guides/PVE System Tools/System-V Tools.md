# System-V Tools Installation

## Overview

Install essential system administration tools and configure storage locations for web installations on Debian/Ubuntu-based systems.

## When to Use

- Setting up new Proxmox or Debian system
- Preparing system for automated installations
- Installing missing diagnostic tools
- Configuring ISO/container storage paths

## Prerequisites

- Debian or Ubuntu system with `apt`
- Root or sudo privileges
- Internet connectivity

## Quick Summary

```bash
apt install -y net-tools curl wget gpg rsync && mkdir -p /var/lib/vz/template/{iso,cache}
```

## Detailed Procedure

### Step 1: Install System-V Tools

**Install network utilities:**

```bash
apt install -y net-tools
```

**Tools included:**
- `netstat` — Network statistics
- `ifconfig` — Interface configuration
- `route` — Routing table manipulation

**Verify installation:**

```bash
netstat -a | head
ifconfig
```

### Step 2: Install Web Installation Packages

**Install download and verification tools:**

```bash
apt install -y curl wget gpg rsync
```

**Package purposes:**

| Package | Purpose |
|---------|---------|
| `curl` | URL-based data transfer |
| `wget` | Recursive file downloading |
| `gpg` | Signature verification |
| `rsync` | File synchronization |

**Verify installations:**

```bash
curl --version
wget --version
gpg --version
rsync --version
```

### Step 3: Configure Storage Locations

**Create ISO storage directory:**

```bash
mkdir -p /var/lib/vz/template/iso
```

**Create container image cache:**

```bash
mkdir -p /var/lib/vz/template/cache
```

**Set permissions (if needed):**

```bash
# Adjust user/group as needed
chown root:root /var/lib/vz/template/iso
chown root:root /var/lib/vz/template/cache
chmod 755 /var/lib/vz/template/iso
chmod 755 /var/lib/vz/template/cache
```

**Verify directories:**

```bash
ls -la /var/lib/vz/template/
```

## Verification

```bash
# All tools available
which netstat ifconfig curl wget gpg rsync

# Directories exist
ls -ld /var/lib/vz/template/iso /var/lib/vz/template/cache

# Test curl connectivity
curl -s --head https://example.com | head -1
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "command not found" | Package not installed | Re-run install command |
| "Permission denied" | Insufficient privileges | Use `sudo` |
| "Directory not writable" | Wrong permissions | Check with `ls -la` |
| "curl: couldn't connect" | Network issue | Check firewall, DNS |

## Notes

- `/var/lib/vz/template/iso` — ISO images for installations
- `/var/lib/vz/template/cache` — Container template cache
- Proxmox uses these paths by default
- Ensure sufficient disk space for downloads
- `net-tools` is deprecated; `ip` command preferred long-term

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/IPMI Tool Management]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/TailScale Container Setup Guide]]

---
**Last Updated:** 2026-03-07
