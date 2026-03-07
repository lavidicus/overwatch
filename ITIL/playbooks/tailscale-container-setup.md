# Tailscale Container Setup

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [tailscale, container, networking, mesh]
---

## Overview

Tailscale provides secure mesh networking for containers, enabling encrypted connectivity without port forwarding or complex firewall rules.

## Priority

**P2** — Important for remote access but not critical path

## Category

**Change Management**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~10 minutes (config + install)
- **Notes:** Authentication requires manual step

## Communication

- **Before starting:** No notification needed
- **After completion:** Verify Tailscale connectivity
- **If blocked:** Check container network access

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Network config overwritten | Low | Use .pve-ignore files |
| Container reboot required | Low | Plan for brief downtime |
| DNS conflicts | Low | Disable MagicDNS |

## Prerequisites

- **Container:** Proxmox LXC container created
- **Account:** Tailscale account
- **Network:** Container has network access

## Procedure

### Step 1: Prevent PVE Updates to Network Config

PVE can overwrite `/etc/hosts` and `/etc/resolv.conf` during updates.

```bash
# On the Proxmox host (not container)
sudo touch /etc/.pve-ignore.hosts
sudo touch /etc/.pve-ignore.resolv.conf
```

These files tell PVE to preserve network configuration files.

### Step 2: Configure LXC for Tailscale Access

**Step 2.1: Locate config file**

```bash
# Find container ID
cat /etc/pve/lxc/VMID.conf

# Or list containers
pct list
```

**Step 2.2: Add device access**

Edit `/etc/pve/lxc/VMID.conf` and add:

```conf
# Tailscale requires tun device access
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```

### Step 3: Apply Configuration

Reboot the container for changes to take effect.

```bash
# Reboot container
pct reboot VMID

# Verify container is running
pct status VMID

# Enter container for installation
pct enter VMID
```

### Step 4: Install Tailscale

Inside the container:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale (without MagicDNS to avoid DNS conflicts)
sudo tailscale up --accept-dns=false
```

### Step 5: Authentication

Follow the instructions from `tailscale up`:

1. Open the provided URL in browser
2. Sign in with your Tailscale account
3. Authorize the device
4. Wait for device to appear online

### Step 6: Disable Key Expiry

To prevent re-authentication on key expiry:

1. Go to **https://tailscale.com/admin**
2. Find your container device
3. Click the device name
4. Disable **Key expiry** toggle

## Verification

### Inside Container

```bash
# Check Tailscale status
tailscale status

# Verify Tailscale IP
tailscale ip

# Test connectivity to other devices
ping <tailscale-ip>
```

### From Other Tailscale Devices

```bash
# Ping the container
ping <container-tailscale-ip>

# Verify connectivity
ssh user@<container-tailscale-ip>
```

## Troubleshooting

### "No route to host" after install

**Cause:** Container needs reboot for tun device access

**Resolution:**
```bash
# From Proxmox host
pct reboot VMID
```

### Tailscale won't start

**Cause:** Missing tun device permissions

**Resolution:**
```bash
# Verify /dev/net/tun exists inside container
ls -la /dev/net/tun

# Check container config
cat /etc/pve/lxc/VMID.conf | grep tun
```

### DNS resolution fails

**Cause:** MagicDNS conflicts with local DNS

**Resolution:**
```bash
# Restart without MagicDNS
tailscale down
tailscale up --accept-dns=false
```

### Key expiry warning

**Cause:** Key expiry not disabled in admin console

**Resolution:**
1. Go to Tailscale admin console
2. Find device
3. Disable key expiry

## Rollback

```bash
# Stop Tailscale
tailscale down

# Uninstall Tailscale
sudo apt remove --purge tailscale

# Remove container config entries (from Proxmox host)
# Edit /etc/pve/lxc/VMID.conf and remove:
#   lxc.cgroup2.devices.allow: c 10:200 rwm
#   lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file

# Reboot container
pct reboot VMID
```

## Related Playbooks

- [[docker-container-failures.md]] — General container troubleshooting
- [[network-connectivity-failures.md]] — Network issues

## Notes

- Tailscale creates a virtual network interface (`tailscale0`)
- Each device gets a stable 100.x.x.x IP
- Traffic is encrypted end-to-end
- Works through NAT and firewalls

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
