---
date: 2026-05-07
tags: vm, migration, proxmox, zfs
category: observation
---

# VM Migration Challenges

## Observation
- ZFS stream format not compatible with raw disk image expectations
- VM 231 migration failed due to partition table missing in ZFS stream
- Transfer rate limited to ~1GB/hour over SSH bandwidth
- 30GB transfer taking 18-20 hours at current rate

## Implications
- Need proper ZFS receive workflow for migrations
- SSH bandwidth is the bottleneck, not storage I/O
- EFI disk configuration needs verification before migration
- Consider using rsync with compression for faster transfers

## Related
- [[vm-migration-playbook]]
- [[zfs-stream-workflow]]
