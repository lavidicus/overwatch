#!/bin/bash
# Quick status check on all known nodes

check_node() {
  local user=$1
  local host=$2
  
  if ! ping -c 1 -W 3 "$host" &>/dev/null; then
    echo "=== $host ==="
    echo "  Unreachable"
    echo ""
    return
  fi
  
  echo "=== $host ==="
  echo "  Reachable"
  
  local os=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${user}@${host}" "hostnamectl --transient 2>/dev/null || hostname" 2>/dev/null)
  echo "  OS: $os"
  
  local ram=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${user}@${host}" "free -h | awk '/Mem:/{print \$2\" total, \"\$3\" used, \"\$4\" free\"}'" 2>/dev/null)
  echo "  RAM: $ram"
  
  local load=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${user}@${host}" "uptime -p" 2>/dev/null)
  echo "  Load: $load"
  
  local disk=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${user}@${host}" "df -h / | awk 'NR==2{print \$5\" used\"}'" 2>/dev/null)
  echo "  Disk: $disk"
  
  echo ""
}

# Gateway itself
echo "=== claw (gateway) ==="
echo "  OS: $(hostnamectl --transient 2>/dev/null || hostname)"
free -h | awk '/Mem:/{print "  RAM: "$2" total, "$3" used, "$4" free"}'
echo "  Load: $(uptime -p)"
df -h / | awk 'NR==2{print "  Disk: "$5" used"}'
if systemctl --user is-active openclaw-gateway &>/dev/null; then
  echo "  OpenClaw: running"
else
  echo "  OpenClaw: DOWN"
fi
echo ""

# Remote nodes (no home-server — ghost hostname)
check_node "localadmin" "node1"
check_node "localadmin" "node2"
check_node "user1" "pve3090-111"
check_node "localadmin" "hermes"
check_node "root" "ts.9xc.local"
check_node "root" "usm1"

# Check llama-servers (GPU nodes only — hermes is CPU-only agent, no llama.cpp)
echo "=== Llama-server status ==="
for n in node1 node2 pve3090-111; do
  if ping -c 1 -W 2 "$n" &>/dev/null; then
    user=$(echo $n | grep -q "pve3090" && echo "user1" || echo "localadmin")
    svc=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${user}@${n}" "systemctl --user is-active llama-server 2>/dev/null || systemctl is-active llama-server 2>/dev/null || echo unknown" 2>&1)
    echo "  $n: llama-server = $svc"
  fi
done
