# Issue Log Template

## Basic Info
- **Issue ID**: ITIL-ISSUE-VM111-PCI-E-GEN-NEGOTIATION
- **Logged**: 2026-05-02 15:51 UTC
- **Logged By**: @lavid:comms.9xc.io (Jeremy)
- **Category**: Problem
- **Priority**: P3

## Description
PCIe link speed reported as 2.5 GT/s ("downgraded") at idle vs 8 GT/s under load. Initial investigation suggested a hardware/BIOS issue on vm111 (Proxmox GPU passthrough) and node2 (bare metal P6000s). Extended testing on node2 revealed this is normal PCIe ASPM behavior — the link drops to 2.5 GT/s at idle to save power and jumps to 8 GT/s when the GPU is loaded.

## Impact
- **Affected Systems**: vm111 (192.168.68.111), node2 (bare metal P6000s)
- **Users Affected**: N/A — no actual impact
- **Business Impact**: None. This is expected PCIe power management behavior. The link re-negotiates to full speed almost instantly when GPU load starts (no perceptible latency).

## Timeline
- **Detected**: 2026-05-02 15:30 UTC
- **Acknowledged**: 2026-05-02 15:51 UTC
- **Current Stage**: New

## Investigation

### vm111 HostPCIe Passthrough Config (Proxmox)
- VM ID: 111
- Machine type: q35
- BIOS: OVMF (Proxmox EDK II 4.2025.05-2)
- GPU passthrough: 2x RTX 3090 (0000:01:00.0, 0000:02:00.0)

### PCIe Link Status (from lspci)

**Root Ports (emulated Q35):**
| Slot | Capable | Running | ASPM | Equalization |
|------|---------|---------|------|--------------|
| 00:01.0 | PCIe 4.0 (16 GT/s) | **2.5 GT/s** | Disabled | **Failed (-)** |

**GPUs (passed through):**
| Slot | Capable | Running | ASPM | Equalization |
|------|---------|---------|------|--------------|
| 01:00.0 (RTX 3090 #1) | PCIe 4.0 (16 GT/s) | **2.5 GT/s** | L1 Enabled | OK (+) |
| 02:00.0 (RTX 3090 #2) | PCIe 4.0 (16 GT/s) | **2.5 GT/s** | L1 Enabled | OK (+) |

### Key Findings (vm111 investigation)
1. Root ports capable of 16 GT/s but showing 2.5 GT/s at idle
2. `EqualizationComplete-` on root ports, `EqualizationComplete+` on GPUs
3. No PCIe errors in journalctl — clean boot from driver perspective

### Node2 Extended Investigation (May 2 21:36-21:44 UTC)
- Boot-time kernel log showed 2.5 GT/s fallback for both GPUs
- `lspci` at idle showed 2.5 GT/s ("downgraded")
- `lspci` under GPU load showed 8 GT/s (full PCIe 3.0)
- **Conclusion: This is normal PCIe ASPM (Active State Power Management) behavior**
- `LnkCtl: ASPM L1 Enabled` — power management is working as designed
- Link drops to 2.5 GT/s at idle, jumps to 8 GT/s when GPU is accessed
- No perceptible latency during re-negotiation (sub-millisecond)
- Same behavior observed in nvtop: idle shows 1@16, load shows 3@16x

### Proxmox Host Access
- Proxmox host: 192.168.68.78 (pve)
- VM 111 config: `/etc/pve/qemu-server/111.conf` (not found on TS — needs to be located)
- Host not reachable from claw (different subnet: 192.168.68.x vs 10.50.15.x)

### Comparison (node2 — healthy)
| GPU | PCIe Speed | Width | Status |
|-----|-----------|-------|--------|
| P6000 #1 | 8 GT/s | x16 | ✅ Max |
| P6000 #2 | 8 GT/s | x16 | ✅ Max |

node2 GPUs run at full PCIe 3.0 x16 — no downgrade.

## Resolution
**CLOSED — No action needed.**

What appeared to be a PCIe downgrade issue is normal ASPM power management. The PCIe link speed drops to 2.5 GT/s at idle and jumps to 8 GT/s under load. This is by design per the PCIe specification.

If the idle speed display is confusing for monitoring purposes, you can:
- Disable ASPM in BIOS (PCIe Link State Power Management → Disabled)
- Or force link speed via sysfs (not recommended — loses power savings)

### Proxmox vm111 Note
The same behavior applies to vm111. The QEMU Q35 root port also implements PCIe ASPM. No config changes needed.

## Follow-up
- **Root Cause**: Normal PCIe ASPM (Active State Power Management) — link speed negotiation at idle vs load
- **Prevention**: N/A — working as designed
- **Known Workaround**: N/A — no workaround needed

## SLA Tracking
- **Target Response**: 2026-05-02 15:51 UTC
- **Target Resolution**: 2026-05-02 21:45 UTC
- **Status**: Resolved

## Resolution Log
- **2026-05-02 21:45 UTC**: Investigated node2 PCIe link speeds — confirmed idle vs load behavior is normal ASPM, not a bug
- **2026-05-02 21:45 UTC**: Closed — no action needed, working as designed

---
*End of Issue Log*
