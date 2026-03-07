# Proxmox HA Cluster Management

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, ha, cluster, high-availability]
---

## Overview

Playbook for managing Proxmox High Availability (HA) cluster configuration, monitoring, and troubleshooting.

## Priority

**P1** — Critical for infrastructure availability

## Category

**Operations**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~10 minutes (HA configuration)
- **Notes:** Cluster operations may require coordination

## Communication

- **Before starting:** Notify team for cluster changes
- **During:** Update status on major operations
- **After:** Document changes in cluster log

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cluster split-brain | High | Proper quorum configuration |
| VM migration failure | Medium | Test failover procedures |
| Service interruption | Medium | Schedule maintenance window |

## Prerequisites

- **Access:** Root or sudo on all cluster nodes
- **Network:** Cluster communication ports open (corosync)
- **Quorum:** Majority of nodes available

## Procedure

### Check Cluster Status

```bash
# Overall cluster status
pvecm status

# List cluster nodes
pvecm nodes

# Check quorum
pvecm quorum

# Corosync status
systemctl status corosync

# View cluster configuration
corosync-cmapctl
```

### Add HA Resource

```bash
# Add VM as HA resource
haresource add vm-100

# Configure HA parameters
haresource set vm-100 priority=10 state=started

# Verify HA configuration
haresource list
```

### Monitor HA Resources

```bash
# List all HA resources
haresource list

# Check specific resource
haresource show vm-100

# View HA log
journalctl -u pve-ha-crm -f
```

### Test Failover

```bash
# Simulate node failure (on non-primary node)
pvecm expected-quorum-value <new_value>

# Monitor failover
watch 'haresource list'

# Restore after test
pvecm expected-quorum-value <original_value>
```

## Verification

```bash
# All nodes healthy
pvecm nodes | grep -q "online" && echo "All nodes online"

# Quorum established
pvecm status | grep -q "quorum: 1" && echo "Quorum OK"

# HA resources configured
haresource list | wc -l
```

## Common Issues

### Lost Quorum

**Symptoms:**
- Services stopped on all nodes
- "lost quorum" in logs

**Resolution:**

```bash
# Check quorum status
pvecm status

# Force quorum if necessary (caution)
pvecm expected-quorum-value 1

# Restart corosync
systemctl restart corosync
```

### Node Not Visible

**Symptoms:**
- Node missing from cluster
- Communication failures

**Resolution:**

```bash
# Check network connectivity
ping <other_node_ip>

# Check corosync ports
nc -zv <other_node_ip> 5404 5405 5406

# Restart corosync
systemctl restart corosync
```

## Rollback

```bash
# Remove HA resource
haresource remove vm-100

# Restore previous configuration
pvecm set expected-quorum-value <original_value>
```

## Related Playbooks

- [[proxmox-vm-lxc-migration.md]] — VM migration during maintenance
- [[proxmox-backup-restore.md]] — Backup before major changes

## Notes

- Corosync ports: 5404, 5405, 5406
- Default quorum: majority of nodes
- Monitor HA logs regularly

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
