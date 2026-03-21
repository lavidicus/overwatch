# Ubuntu Kernel 6.5.11 Pin (Mainline)

---
**Author:** Sam
**Created:** 2026-03-05
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [ubuntu, kernel, grub, pinning]
---

## Overview

Pin Ubuntu to boot **6.5.11-060511-generic** by default (instead of 6.8) using a **hard GRUB pin by menuentry ID**. This prevents automatic kernel updates from changing the boot default.

## Priority

**P2** — Kernel stability, important for compatibility

## Category

**Change Management**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~10 minutes (grub edit + update)
- **Notes:** Requires reboot

## Communication

- **Before starting:** Notify users of reboot
- **After completion:** Confirm kernel version
- **If blocked:** Check grub config permissions

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Boot failure | High | Keep old kernel available |
| Wrong menuentry ID | Medium | Verify grub.cfg first |
| Reboot downtime | Low | Schedule maintenance window |

## Preconditions

- ✅ Kernel **6.5.11-060511-generic** is already installed
- ✅ You have `sudo` access on the host
- ✅ GRUB configuration file is accessible

## Procedure

### Step 1: Confirm 6.5 Kernel Exists in GRUB

```bash
sudo grep -nE "submenu 'Advanced options for Ubuntu|menuentry 'Ubuntu, with Linux 6\.5\.11|menuentry 'Ubuntu, with Linux 6\.8" /boot/grub/grub.cfg | head -n 80
```

**Expected output:** Lines showing:
- `submenu 'Advanced options for Ubuntu`
- `menuentry 'Ubuntu, with Linux 6.5.11-060511-generic`
- `menuentry 'Ubuntu, with Linux 6.8.0-101-generic`

### Step 2: Extract the 6.5.11 GRUB Menuentry ID

```bash
grep -A 1 "menuentry 'Ubuntu, with Linux 6.5.11-060511-generic" /boot/grub/grub.cfg
```

**Look for:** `menuentry_id_option=` line like:
```
gnulinux-6.5.11-060511-generic-advanced-6e099cec-5135-4ee6-a45c-618fe2a90e94
```

### Step 3: Hard-Pin GRUB to 6.5.11 by ID

**⚠️ IMPORTANT:** Use the exact ID from step 2. Do NOT use `saved_entry` — this creates a hard pin.

```bash
sudo vim /etc/default/grub
```

Set these lines (replace with your exact ID):

```conf
GRUB_DEFAULT="gnulinux-6.5.11-060511-generic-advanced-6e099cec-5135-4ee6-a45c-618fe2a90e94"
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
```

Ensure these are NOT active (remove or comment if present):

```conf
#GRUB_DEFAULT=saved
#GRUB_SAVEDEFAULT=true
```

Apply configuration:

```bash
sudo update-grub
```

**Output should show:** "Found Linux image: /boot/vmlinuz-6.5.11-060511-generic"

### Step 4: Reboot and Verify Active Kernel

```bash
sudo reboot

# After boot
uname -r
```

**Expected:** `6.5.11-060511-generic`

### Step 5: Validation (GRUB Pin Still Configured)

```bash
grep -nE "GRUB_DEFAULT|GRUB_TIMEOUT_STYLE|GRUB_TIMEOUT|GRUB_SAVEDEFAULT" /etc/default/grub
uname -r
```

**Expected output:**
```
GRUB_DEFAULT="gnulinux-6.5.11-060511-generic-advanced-6e099cec-5135-4ee6-a45c-618fe2a90e94"
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
```

And:
```
6.5.11-060511-generic
```

## Success Criteria

- ✅ `uname -r` returns `6.5.11-060511-generic`
- ✅ `/etc/default/grub` has hardcoded `GRUB_DEFAULT` with the 6.5.11 ID
- ✅ `GRUB_SAVEDEFAULT` is commented out (not active)
- ✅ GRUB menu shows timeout of 5 seconds

## Rollback (Restore Default Behavior)

```bash
sudo vim /etc/default/grub
```

Set default to first entry:

```conf
GRUB_DEFAULT=0
```

Apply + reboot:

```bash
sudo update-grub
sudo reboot
```

Verify:

```bash
uname -r
```

Should now boot to the latest available kernel (likely 6.8.x).

## Troubleshooting

### GRUB won't boot to 6.5.11

**Check:** Is the kernel actually installed?
```bash
ls -la /boot/vmlinuz-6.5.11-060511-generic
```

**If missing:**
```bash
sudo apt-get install linux-image-6.5.11-060511-generic
sudo update-grub
```

### GRUB_DEFAULT syntax error

**Make sure the ID is in quotes:**
```conf
GRUB_DEFAULT="exact-id-from-grub.cfg"
```

**NOT:**
```conf
GRUB_DEFAULT=exact-id-from-grub.cfg  # WRONG
```

### Boot fails after update-grub

**Recovery:**
1. Boot from GRUB menu manually select 6.5.11
2. Once booted, verify:
   ```bash
   cat /etc/default/grub | grep GRUB_DEFAULT
   ```
3. If still wrong, fix the ID and run `sudo update-grub` again

## Related Issues

- [ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md](../ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md) - usm1 kernel lock
- [ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md](../ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md) - Proxmox kernel considerations

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
