# PLAYBOOK: Hermes Agent AppArmor Storm (VM-226)

**Created:** 2026-04-04  
**Author:** Sam (ocg)  
**Status:** Fixed (2026-04-04)  
**Severity:** P2 - Host Stability  
**Affected System:** MAS Proxmox Host (172.16.254.202)

---

## Purpose

This playbook documents the root cause and fix for the **Hermes agent AppArmor permission storm** that caused MAS host instability and SSH flakiness.

---

## Symptoms

- SSH connection became unreliable on MAS
- System load spiked unexpectedly
- Kernel logs filled with `apparmor="DENIED"` errors
- `perf: interrupt took too long` warnings
- System required reboot to recover

---

## Root Cause

### The Storm Pattern

**Hermes agent (VM-226)** had an AppArmor profile that denied rsyslog writes to `/run/systemd/journal/dev-log`. The daemon kept retrying every 30 seconds:

1. **rsyslog** in container VM-226 tries to write to `/run/systemd/journal/dev-log`
2. AppArmor profile says **DENIED**
3. rsyslog daemon **retries** every 30 seconds (retry loop)
4. **100+ denials** flood kernel audit logs
5. System CPU spends time processing retries instead of useful work
6. **SSH queue backs up** — host becomes unresponsive

### Timeline

- **2026-04-03 18:52 UTC** — MAS rebooted (first attempt to fix)
- **2026-04-03 18:52-21:45 UTC** — SSH flaky due to retry storm
- **2026-04-04 00:24 UTC** — Hermes agent started fresh after reboot
- **2026-04-04 01:48 UTC** — Investigation complete

---

## Evidence

### dmesg Log (Key Errors)

```
[11020.571425] audit: type=1400 audit(...): apparmor="DENIED" operation="sendmsg" 
  class="file" namespace="root//lxc-226_<-var-lib-lxc>" 
  profile="rsyslogd" name="/run/systemd/journal/dev-log" 
  pid=90263 comm="systemd-journal" requested_mask="r" denied_mask="r"

[11275.827881] audit: type=1400 audit(...): apparmor="DENIED" ... (repeated 100+ times)

[10344.168660] perf: interrupt took too long (2637 > 2500), 
  lowering kernel.perf_event_max_sample_rate to 75000
```

### Container Status

```
VMID  NAME        STATUS
226   hermes      running
```

### Process Details

```
PID  USER      MEM    CMD
235  localadm+  64MB  /opt/hermes-agent/venv/bin/python3 /opt/hermes-agent/venv/bin/hermes gateway run
```

---

## The Fix

### Step 1: Add LXC Features

```bash
# Add nesting and mount features to VM-226
pct set 226 -features nesting=1,mount=1
```

**What this does:**
- `nesting=1` — Allows the container to use nested namespaces
- `mount=1` — Allows proper mount namespace handling for log directories

### Step 2: Restart Container

```bash
# Stop and restart the container to apply new features
pct stop 226
sleep 5
pct start 226
```

**Why restart:**
- New features require container reboot to take effect
- AppArmor profiles reload cleanly on start
- rsyslog can now write to expected paths

---

## Verification

After applying the fix:

1. ✅ Container status: `pct status 226` → **running**
2. ✅ Hermes agent process: `pct exec 226 -- ps aux | grep hermes` → **active**
3. ✅ AppArmor denials: `dmesg | grep DENIED` → **reduced from 100+ to ~1/minute**
4. ✅ SSH connectivity: **stable and responsive**
5. ✅ System load: **normal**

---

## Prevention

### Monitor for Future Storms

Add to **HEARTBEAT.md** checklist:
- [ ] Check `dmesg | grep apparmor.*DENIED` — should be minimal
- [ ] Verify VM-226 (hermes) is running: `pct status 226`
- [ ] Check system load: `uptime` — should be normal

### AppArmor Profile Override

Create permanent AppArmor override for hermes:

```bash
# Create profile override
cat > /etc/apparmor.d/local/lxc-226 << 'EOF'
profile=/var/lib/lxc/226/** rsyslogd {
  /run/systemd/journal/dev-log rw,
  /run/systemd/journal/ rw,
}
EOF

# Reload profile
apparmor_parser -R /etc/apparmor.d/local/lxc-226
```

### Feature Checklist for LXC Containers

Always ensure containers have:
- ✅ `nesting=1` — For proper namespace handling
- ✅ `mount=1` — For filesystem access
- ✅ `unprivileged=0` (if needed) — For root access
- ✅ `features=` — Set explicitly in `/etc/pve/lxc/226.conf`

---

## Related Files

- **Container Config:** `/etc/pve/lxc/226.conf`
- **AppArmor Profiles:** `/etc/apparmor.d/lxc/`
- **Hermes Agent:** `/opt/hermes-agent/`
- **System Logs:** `/var/log/syslog`, `dmesg`

---

## Quick Reference

### Commands

```bash
# Check container status
pct status 226

# View container config
cat /etc/pve/lxc/226.conf

# Restart container
pct reboot 226  # or stop + start

# Check AppArmor denials
dmesg | grep apparmor.*DENIED | tail -20

# Monitor system load
watch -n 5 'uptime; ps aux | grep hermes'
```

### Container Details

| Property | Value |
|----------|-------|
| VMID | 226 |
| Name | hermes |
| Host | MAS (172.16.254.202) |
| Status | Running |
| Process | hermes gateway run (PID 235) |
| Memory | 64MB RAM |
| Features | nesting=1, mount=1 |

---

## Lessons Learned

1. **AppArmor storms are silent killers** — 100+ denials per minute can overwhelm a host
2. **SSH flakiness can have root cause far away** — not always network issues
3. **Reboots don't always fix permission storms** — the underlying issue persists
4. **LXC features matter** — `nesting` and `mount` are critical for proper operation
5. **Monitor kernel logs** — `dmesg` reveals what `journalctl` might miss

---

*Last updated: 2026-04-04 02:03 UTC by Sam (ocg)*
