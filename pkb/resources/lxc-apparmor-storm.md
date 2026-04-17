# LXC Container AppArmor Storm

**Created:** 2026-04-04  
**Category:** Infrastructure · Container · AppArmor  
**Source:** Herme's agent permission storm on MAS

---

## The Problem

An LXC container (VM-226, hermes) had an **AppArmor permission storm** that overwhelmed the PVE host:

- rsyslog tried writing to `/run/systemd/journal/dev-log` every 30 seconds
- AppArmor profile said **DENIED**
- Daemon retry loop created **100+ denials/hour**
- System CPU spent on retry processing instead of useful work
- SSH queue backed up, host became unresponsive

---

## Why It Happened

### AppArmor Basics

AppArmor is Linux's Mandatory Access Control (MAC). Each process has a profile defining what files/ports it can access:

```
Process tries to access → AppArmor checks profile → ALLOWED or DENIED
```

### The Storm Pattern

**Normal behavior:**
- Process tries → Denied → Tries once more → Gives up
- **Result:** 2-3 log entries, system stays calm

**The storm:**
- Process (rsyslog) tries → Denied
- Daemon **keeps retrying** every 30 seconds
- AppArmor logs **each denial** to kernel audit
- **100+ denials** flood kernel log buffer
- System spends CPU on retry loops
- **SSH queue backs up**

### Root Cause

The hermes container's AppArmor profile was too strict for rsyslog's expected log path:

- **Expected path:** `/run/systemd/journal/dev-log`
- **Container path:** `/var/lib/lxc/226//run/systemd/journal/dev-log`
- **Mismatch:** Profile didn't allow the mount namespace path

---

## The Fix

### 1. Add LXC Features

```bash
pct set 226 -features nesting=1,mount=1
```

- `nesting=1` — Allows nested namespaces
- `mount=1` — Allows proper mount namespace handling

### 2. Restart Container

```bash
pct stop 226 && sleep 5 && pct start 226
```

New features take effect on container reboot.

### 3. Verify AppArmor Profile

```bash
# Check for remaining denials
dmesg | grep apparmor.*DENIED | tail -5

# Should be minimal now (1/minute vs 100+/hour)
```

---

## Prevention

### Container Configuration

Always set proper LXC features:

```bash
pct set <vmid> -features nesting=1,mount=1
```

### Permanent AppArmor Override

```bash
cat > /etc/apparmor.d/local/lxc-<vmid> << 'EOF'
profile=/var/lib/lxc/<vmid>/** rsyslogd {
  /run/systemd/journal/dev-log rw,
  /run/systemd/journal/ rw,
}
EOF

apparmor_parser -R /etc/apparmor.d/local/lxc-<vmid>
```

### Monitoring

Add to **HEARTBEAT.md**:
- [ ] Check `dmesg | grep apparmor.*DENIED` — should be minimal
- [ ] Verify container is running: `pct status <vmid>`
- [ ] Monitor system load: `uptime`

---

## Symptoms of Future Storms

- SSH becomes slow or unresponsive
- System load spikes unexpectedly
- Kernel logs flood with `apparmor="DENIED"`
- `perf: interrupt took too long` warnings
- System requires reboot to recover

---

## Lessons

1. **Permission storms are silent killers** — 100+ denials/hour can overwhelm a host
2. **SSH issues can have root cause far away** — not always network
3. **Reboots don't always fix** — underlying permission issue persists
4. **LXC features matter** — `nesting` and `mount` are critical
5. **Monitor kernel logs** — `dmesg` reveals what `journalctl` might miss

---

## Related

- **Playbook:** `ITIL/playbooks/hermes-apparmor-storm.md`
- **Host:** MAS Proxmox (172.16.254.202)
- **Container:** VM-226 (hermes)

---

*Created: 2026-04-04 by Sam (ocg)*
