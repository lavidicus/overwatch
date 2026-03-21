# Proxmox Node Swap Suddenly High

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, memory, swap, performance]
---

## Overview

Quickly diagnose whether a Proxmox node is actively swapping (problematic) or just showing "swap-stuck" from a past memory pressure event, then safely clear swap and reduce future occurrence.

## Priority

**P2** — Performance issue, not critical

## Category

**Incident Response**

## Estimated Duration

- **Total:** ~10-20 minutes
- **Critical path:** ~5 minutes (clear swap)
- **Notes:** Investigation may take longer if active swapping

## Communication

- **Before starting:** No notification needed
- **After completion:** Log if memory pressure recurring
- **If blocked:** Check for runaway processes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| System slowdown during swap clear | Low | Clear during low-usage period |
| VM performance impact | Low | Monitor during operation |
| Memory pressure recurrence | Medium | Investigate root cause |

## Prerequisites

- **Access:** Root or sudo on Proxmox node
- **Tools:** vmstat, swapon, free

## Triage: Is Swap Active Right Now?

```bash
free -h
swapon --show
vmstat 1 10
```

### Interpreting `vmstat`

| Metric | Meaning | Action |
|--------|---------|--------|
| `si` / `so` mostly **0** | Swap not actively thrashing | Safe to clear swap |
| `si` / `so` repeatedly **non-zero** | Active swapping (investigate first) | Do NOT clear swap yet |

- **si** = swap in (pages from disk to RAM)
- **so** = swap out (pages from RAM to disk)

## Procedure

### Option A: Simple (Full Reset)

**Use when:** Swap is not actively thrashing (`si`/`so` ≈ 0)

```bash
sudo swapoff -a
sudo swapon -a
free -h
swapon --show
```

### Option B: Safer (One Target at a Time)

1. **Identify swap targets:**
```bash
swapon --show
```

2. **Clear a specific swap device/file:**
```bash
sudo swapoff /dev/<swap-device-or-swapfile>
sudo swapon /dev/<swap-device-or-swapfile>
```

3. **If `swapoff` fails or RAM gets tight:**
- Stop immediately
- Capture diagnostic data:
```bash
free -h
swapon --show
```

### Investigate: What Caused Swap Pressure?

**Only run if `vmstat` shows sustained `si`/`so > 0`**

```bash
# Top RAM consumers
ps -eo pid,user,comm,%mem,rss --sort=-rss | head -30

# Proxmox guests overview
pvesh get /nodes/$(hostname)/qemu --output-format yaml | sed -n '1,200p'
pvesh get /nodes/$(hostname)/lxc --output-format yaml | sed -n '1,200p'

# Memory + Swap summary
grep -E 'MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree' /proc/meminfo

# OOM events
dmesg -T | grep -i "out of memory" | tail -20
```

### Prevent: Reduce Swap Aggressiveness

```bash
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
sysctl vm.swappiness
```

## Verification

```bash
# swapon shows low/near-zero used swap
swapon --show

# vmstat shows si/so near zero
vmstat 1 10

# swappiness is set
sysctl vm.swappiness

# MemAvailable is healthy
free -h
```

## Success Criteria

- ✅ `swapon --show` shows low/near-zero used swap
- ✅ `vmstat 1 10` shows `si`/`so` near zero during normal load
- ✅ `vm.swappiness` reports `10`
- ✅ `free -h` shows healthy `MemAvailable`

## Escalation Data to Collect

```bash
free -h
swapon --show
vmstat 1 10
ps -eo pid,user,comm,%mem,rss --sort=-rss | head -30
pvesh get /nodes/$(hostname)/qemu --output-format yaml
pvesh get /nodes/$(hostname)/lxc --output-format yaml
dmesg -T | grep -i "out of memory" | tail -20
```

## Related Playbooks

- [[proxmox-vm-lxc-migration.md]] — Migrate VMs if memory pressure
- [[ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md]] — Context overflow
- [[ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md]] — Kernel lock

## Notes

- Swap-stuck is normal after memory pressure events
- Active swapping indicates real memory problems
- Reduce swappiness to prevent premature swapping

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
