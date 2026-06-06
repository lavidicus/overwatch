# Issue Log

## Basic Info
- **Issue ID**: ITIL-ISSUE-005
- **Logged**: 2026-04-18 04:57 UTC
- **Logged By**: Jeremy (Lavid) / Sam
- **Category**: Incident
- **Priority**: P2 (hardware replacement needed — ZFS pool degraded but still online)

## Description
Replace failing 10TB HDD in TS Proxmox SAS ZFS pool. Drive /dev/sdd (Serial: ZA21CCQ7) has 36,704 reallocated sectors per SMART health check, indicating media degradation.

## Impact
- **Affected Systems**: TS (ts.9xc.local) — Proxmox host, SAS ZFS pool (raidz1)
- **Users Affected**: Jeremy (sole user of TS storage)
- **Business Impact**: Pool still fully functional via parity redundancy, but at risk of data loss if a second drive fails during rebuild. Drive failure probability increases with reallocated sector count.

## Timeline
- **Detected**: 2026-04-18 04:49 UTC — routine systems health check
- **Acknowledged**: 2026-04-18 04:57 UTC
- **Replacement Ordered**: 2026-04-19
- **Replacement Completed**: 2026-04-27 — new drive installed (Serial: ZA23VZQB, Seagate ST10000NM0086)
- **Resilver Completed**: 2026-04-28 05:33 UTC — 5.04T resilvered in 10h 26m with 0 errors
- **Current Stage**: Resolved — pool healthy, all checks passed

## Investigation
SMART health check via `smartctl` on 2026-04-18 04:49 UTC revealed:

### /dev/sdd (FAILING)
- **Model**: Seagate ST10000NM0086-2AA101 (10TB Enterprise)
- **Serial**: ZA21CCQ7
- **Reallocated_Sector_Ct**: 36,704 ⚠️
- **SMART overall-health**: PASSED (but sector count indicates imminent failure)
- **Airflow Temp**: 34°C
- **Error Log**: No logged SMART errors yet (ZFS masked them)

### Comparison — Other Pool Members (all healthy)
| Drive | Serial | Reallocated Sectors | Temp |
|---|---|---|---|
| /dev/sda | ZA21FE2N | 8 | 37°C |
| /dev/sdb | ZA2DYRC3 | 0 | 35°C |
| /dev/sdc | ZA22PC0Y | 0 | 34°C |

### ZFS Pool Status
- **Pool**: `SAS` (raidz1, 4× 10TB = 34.4TB raw, 25.8TB usable)
- **State**: ONLINE
- **Errors**: 0 read/write/cksum
- **Last scrub**: 2026-04-12 — 0 errors
- **Allocation**: 19.9T used / 14.5T free

No I/O errors or timeout messages in kernel journal. ZFS has been handling the drive's bad sectors transparently.

## Resolution
**Actions Completed:**
1. ✅ Replacement 10TB enterprise HDD ordered (2026-04-19) — $270
2. ✅ Drive received and installed (2026-04-27)
3. ✅ `zpool offline SAS /dev/sdd` executed
4. ✅ Physically replaced failing drive (Serial: ZA21CCQ7) with new drive (Serial: ZA23VZQB, Seagate ST10000NM0086)
5. ✅ `zpool replace SAS` executed — resilver started
6. ✅ Resilver completed: 5.04T in 10h 26m (2026-04-28 05:33 UTC) with **0 errors**
7. ✅ Pool verification: `zpool status SAS` — state ONLINE, all devices ONLINE, 0 read/write/cksum errors
8. ✅ SMART check on new drive — all critical attributes clean (Reallocated_Sector_Ct: 0, Current_Pending_Sector: 0, UDMA_CRC: 0)

## Follow-up
- **Root Cause**: Natural drive media degradation / wear (36,704 reallocated sectors on old drive)
- **Prevention**: Schedule quarterly SMART health checks on all pool members. Consider adding hot spare to SAS pool.
- **Next Step**: Close ticket.

## SLA Tracking
- **Target Response**: Immediate (acknowledged)
- **Target Resolution**: Within 7 days (awaiting drive procurement)
- **Actual Resolution**: 9 calendar days (drive procurement delay)
- **Status**: ✅ **Resolved** — pool healthy, resilver complete, 0 errors

## Procurement Notes
- **Required**: 10TB Enterprise HDD (SATA 6Gb/s, 3.5")
- **Compatible models**: Seagate Exos X16/X18, Seagate IronWolf Pro 10TB, WD Ultrastar DC HC520
- **Current pool drives**: Seagate Enterprise Capacity 3.5 (ST10000NM0086 / ST10000NM0126 / ST10000NM0046)
- **Suggested**: Match Seagate Enterprise Capacity for consistency

---
*End of Issue Log*
