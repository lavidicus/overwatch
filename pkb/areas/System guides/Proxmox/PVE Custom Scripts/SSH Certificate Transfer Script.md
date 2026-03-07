# SSH Passwordless Setup Script

## Overview

Automated script to configure passwordless SSH between servers using RSA key pairs. Generates keys and copies public key to remote server.

## When to Use

- Setting up automation between servers
- Configuring Proxmox cluster communication
- Enabling script-based server management
- Creating backup server connections

## Prerequisites

- Source server with bash and SSH tools
- Remote server with SSH access
- Username and hostname of remote server
- Passwordless SSH not yet configured

## Quick Summary

```bash
./Configure_SSH.sh <remote-user> <remote-host>
# Example: ./Configure_SSH.sh root 192.168.1.100
```

## Detailed Procedure

### Step 1: Create the Script

**Save as `/root/Configure_SSH.sh`:**

```bash
#!/bin/bash
# Configure_SSH.sh - Set up passwordless SSH between servers

# Check arguments
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <remote_user> <remote_host>"
  echo "Example: $0 root 192.168.1.100"
  exit 1
fi

REMOTE_USER="$1"
REMOTE_HOST="$2"

# Generate SSH key pair if not exists
if [ ! -f "$HOME/.ssh/id_rsa" ]; then
  echo "Generating 4096-bit RSA key pair..."
  ssh-keygen -t rsa -b 4096 -N "" -f "$HOME/.ssh/id_rsa"
  echo "Key pair generated."
else
  echo "SSH key pair already exists."
fi

# Copy public key to remote server
echo "Copying public key to ${REMOTE_USER}@${REMOTE_HOST}..."
ssh-copy-id -i "$HOME/.ssh/id_rsa.pub" "${REMOTE_USER}@${REMOTE_HOST}"

echo "Passwordless SSH setup complete."
echo "Test connection: ssh ${REMOTE_USER}@${REMOTE_HOST}"
```

**Make executable:**

```bash
chmod +x /root/Configure_SSH.sh
```

### Step 2: Run the Script

```bash
# Syntax
/root/Configure_SSH.sh <remote-user> <remote-host>

# Example
/root/Configure_SSH.sh root 192.168.1.100
```

### Step 3: Understand What Happens

**Script actions:**

1. Validates two arguments provided
2. Generates 4096-bit RSA key pair (if missing)
3. Uses `ssh-copy-id` to copy public key
4. Adds key to `~/.ssh/authorized_keys` on remote

**Files created/modified:**

| File | Location | Purpose |
|------|----------|----------|
| `id_rsa` | `~/.ssh/` | Private key (NEVER share) |
| `id_rsa.pub` | `~/.ssh/` | Public key (shared) |
| `authorized_keys` | `~/.ssh/` on remote | Accepts public keys |

### Step 4: Manual Alternative

**If script fails, do manually:**

```bash
# Generate key
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa

# Copy key manually
cat ~/.ssh/id_rsa.pub | ssh root@<host> "mkdir -p ~/.ssh && tee -a ~/.ssh/authorized_keys"
```

## Verification

```bash
# Test passwordless connection
ssh root@<remote-host> "echo SSH works without password"

# Verify key used
ssh -v root@<remote-host> 2>&1 | grep "Offering public key"

# Check remote authorized_keys
ssh root@<remote-host> "cat ~/.ssh/authorized_keys"
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Permission denied (publickey)" | Key not added | Re-run script or add manually |
| "Host key not verified" | First connection | Accept host key or add to known_hosts |
| "Too many authentication failures" | Multiple keys | Check `~/.ssh/config` |
| Script fails mid-way | Network issue | Check connectivity, retry |

## Notes

- Key size 4096-bit provides strong security
- Empty passphrase (`-N ""`) enables true passwordless access
- Private key (`id_rsa`) must never leave source server
- `ssh-copy-id` handles permissions automatically
- Can script multiple hosts in a loop

**Example: Setup multiple hosts:**

```bash
for host in server1 server2 server3; do
  /root/Configure_SSH.sh root $host
done
```

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Configurations/Migrating LXC and VMs between Proxmox Hosts]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/ZFS Dataset Transfer Guide]]

---
**Last Updated:** 2026-03-07
