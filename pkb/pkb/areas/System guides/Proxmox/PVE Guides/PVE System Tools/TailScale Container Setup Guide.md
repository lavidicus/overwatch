# Tailscale Setup in Proxmox LXC Container

## Overview

Configure a Proxmox LXC container for Tailscale access, including preventing Proxmox from overwriting network configuration files.

## When to Use

- Secure remote access to containers
- Mesh networking between Proxmox hosts
- Site-to-site VPN alternative
- Accessing containers without port forwarding

## Prerequisites

- Proxmox environment with existing LXC container
- Tailscale account
- Root or sudo access to Proxmox host
- Container VMID (replace `VMID#` in commands)

## Quick Summary

```bash
# On Proxmox host
touch /etc/.pve-ignore.{hosts,resolv.conf}
echo -e "lxc.cgroup2.devices.allow: c 10:200 rwm\nlxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file" >> /etc/pve/lxc/<VMID>.conf
pct reboot <VMID>

# Inside container
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --accept-dns=false
```

## Detailed Procedure

### Step 1: Prevent Proxmox File Overwrites

**On Proxmox host, create ignore files:**

```bash
touch /etc/.pve-ignore.hosts
touch /etc/.pve-ignore.resolv.conf
```

**Verify files created:**

```bash
ls -la /etc/.pve-ignore.*
```

### Step 2: Configure LXC Container for TUN Device

**Edit container configuration:**

```bash
nano /etc/pve/lxc/<VMID>.conf
```

**Add these lines:**

```bash
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```

**Save and exit.**

**Alternative: Add via command line:**

```bash
echo "lxc.cgroup2.devices.allow: c 10:200 rwm" >> /etc/pve/lxc/<VMID>.conf
echo "lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file" >> /etc/pve/lxc/<VMID>.conf
```

### Step 3: Reboot Container

**List containers to confirm VMID:**

```bash
pct list
```

**Reboot the container:**

```bash
pct reboot <VMID>
```

**Enter container to verify:**

```bash
pct enter <VMID>
```

**Verify TUN device accessible:**

```bash
ls -la /dev/net/tun
```

### Step 4: Install Tailscale

**Inside the container:**

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale (without MagicDNS)
systemctl start tailscale
```

### Step 5: Configure Tailscale

```bash
# Enable without MagicDNS
tailscale up --accept-dns=false

# Check status
tailscale status
```

### Step 6: Authenticate

**Follow the URL shown by `tailscale up`:**

1. Open the authentication URL in a browser
2. Log in with your Tailscale account
3. Grant permissions

### Step 7: Disable Key Expiry

**Via Tailscale Admin Console:**

1. Go to https://tailscale.com/admin
2. Find your container device
3. Disable key expiry for this device

**Or via CLI (if admin):**

```bash
tailscale set --advertise-routes=<routes> --advertise-exit-node=false
```

## Verification

```bash
# Inside container

# Tailscale service running
systemctl status tailscale

# Tailscale interface exists
ip addr show tailscale0

# Connection established
tailscale status

# Ping another Tailscale device
tailscale ping <device-name>

# From Proxmox host, verify container has Tailscale IP
tailscale status
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `/dev/net/tun: No such file` | TUN not mounted | Reboot container, check `.conf` |
| `tailscale: command not found` | Not installed | Re-run install script |
| Auth URL doesn't work | Expired | Run `tailscale up` again |
| Container not in status | Not authenticated | Complete auth flow |
| `/etc/hosts` overwritten | Ignore file missing | Re-create `/etc/.pve-ignore.hosts` |

## Notes

- `--accept-dns=false` prevents Tailscale from managing DNS
- Key expiry disabled to prevent re-authentication
- Container needs network access to tailscale.com
- MagicDNS can be enabled later if desired
- Use `tailscale down` to disconnect temporarily

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Configurations/PVE System Name IP Change Guide]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/IPMI Tool Management]]

---
**Last Updated:** 2026-03-07
