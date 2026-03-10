#!/bin/bash
# Join Proxmox cluster script

NODE_IP="${1:-172.16.253.240}"
PASSWORD="${2:-password}"

echo "Joining cluster at $NODE_IP..."

# Use printf to send both responses
printf "yes\n%s\n" "$PASSWORD" | pvecm add "$NODE_IP"
