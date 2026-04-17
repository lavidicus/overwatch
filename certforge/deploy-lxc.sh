#!/bin/bash
# CertForge LXC Container Creation Script
# Creates a dedicated LXC container for PKI infrastructure

set -e

CONTAINER_ID=200
CONTAINER_NAME="certforge"
OSTYPE="debian"
TEMPLATE="debian-12-generic-lxc_12.0-1_amd64.tar.gz"
TEMPLATE_URL="https://download.proxmox.com/images/system/$TEMPLATE"

echo "🔨 Creating CertForge LXC container..."

# Create container
pct create $CONTAINER_ID \
    local:vztmpl/$TEMPLATE \
    -arch amd64 \
    -cores 4 \
    -memory 4096 \
    -swap 2048 \
    -ostype $OSTYPE \
    -hostname certforge \
    -net0 "name=eth0,bridge=vmbr0,firewall=1,gw=172.16.254.1,type=veth" \
    -rootfs local-lvm:vm-200-disk-0,size=50G

echo "✅ Container created. Waiting for boot..."
sleep 10

# Configure container
pct set $CONTAINER_ID \
    -nameserver 172.16.254.1 \
    -searchdomain 9xc.local \
    -onboot 1

# Install Docker and dependencies
pct exec $CONTAINER_ID -- bash -c '
    echo "📦 Installing Docker and dependencies..."
    
    # Update system
    apt-get update
    
    # Install prerequisites
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker GPG key
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Set up stable repository
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker service
    systemctl enable docker
    systemctl start docker
    
    # Add root to docker group (for unprivileged setup)
    useradd -m certforge
    usermod -aG docker certforge
    
    echo "✅ Docker installed"
'

# Copy CertForge files to container
echo "📁 Deploying CertForge application..."
pct mount $CONTAINER_ID /SAS/Library
scp -i ~/.ssh/id_rsa -r /home/localadmin/.openclaw/workspace/certforge root@ts.9xc.local:/tmp/certforge
pct exec $CONTAINER_ID -- bash -c '
    mkdir -p /opt/certforge
    mv /tmp/certforge/* /opt/certforge/
    cd /opt/certforge
    docker compose up -d
'

echo "✅ CertForge LXC container deployed!"
echo ""
echo "Access URLs:"
echo "  - Admin Portal: http://172.16.254.200:3000"
echo "  - API: http://172.16.254.200:5000"
echo "  - Intermediate CA: http://172.16.254.200:5001"
echo "  - OCSP Responder: http://172.16.254.200:8888"
