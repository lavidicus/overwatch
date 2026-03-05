# Proxmox Node Swap Suddenly High

## Overview

Quickly diagnose whether a Proxmox node is actively swapping (problematic) or just showing "swap-stuck" from a past memory pressure event, then safely clear swap and reduce future occurrence.

---

## Triage: Is Swap Active Right Now?

Run these commands:

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

---

## Fix: Clear Swap Safely (No Reboot)

### Option A: Simple (Full Reset)

```bash
sudo swapoff -a
sudo swapon -a
free -h
swapon --show
```

**Use when:** Swap is not actively thrashing (`si`/`so` ≈ 0)

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

---

## Investigate: What Caused Swap Pressure?

**Only run if `vmstat` shows sustained `si`/`so > 0`**

### Top RAM Consumers

```bash
ps -eo pid,user,comm,%mem,rss --sort=-rss | head -30
```

### Proxmox Guests Overview

```bash
# VMs
pvesh get /nodes/$(hostname)/qemu --output-format yaml | sed -n '1,200p'

# LXC containers
pvesh get /nodes/$(hostname)/lxc --output-format yaml | sed -n '1,200p'
```

### Memory + Swap Summary

```bash
grep -E 'MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree' /proc/meminfo
```

### Additional Diagnostics

```bash
# Dmesg for OOM events
dmesg -T | grep -i "out of memory" | tail -20

# Current memory pressure
cat /proc/meminfo | grep -E 'MemAvailable|Committed_AS|Slab'
```

---

## Prevent: Reduce Swap Aggressiveness

Lower swappiness to discourage early swapping:

```bash
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
sysctl vm.swappiness
```

### Verification

```bash
# Confirm swappiness is set
sysctl vm.swappiness

# Should return: vm.swappiness = 10
```

---

## Success Criteria

- ✅ `swapon --show` shows low/near-zero used swap
- ✅ `vmstat 1 10` shows `si`/`so` near zero during normal load
- ✅ `vm.swappiness` reports `10`
- ✅ `free -h` shows healthy `MemAvailable`

---

## Escalation Data to Collect (If Still Swapping)

Paste outputs of:

1. `free -h`
2. `swapon --show`
3. `vmstat 1 10`
4. `ps -eo pid,user,comm,%mem,rss --sort=-rss | head -30`
5. `pvesh get /nodes/$(hostname)/qemu --output-format yaml`
6. `pvesh get /nodes/$(hostname)/lxc --output-format yaml`
7. `dmesg -T | grep -i "out of memory" | tail -20`

---

## Related Issues

- [ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md](../ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md) - Context overflow
- [ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md](../ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md) - Kernel lock

---

**Owner:** Sam (ops butler AI)  
**Last Updated:** 2026-03-05 04:06 UTC  
**Status:** Ready for deployment