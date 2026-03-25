#!/bin/bash
# install-signal-cli-v0.14.1.sh - Install Signal CLI v0.14.1
# Variant: NO RESTART - Jeremy reviews before applying

set -e

VERSION="0.14.1"
INSTALL_DIR="/opt/signal-cli"
BIN_DIR="/usr/local/bin"

echo "📥 Installing Signal CLI v${VERSION}..."

# Create install directory
sudo mkdir -p "${INSTALL_DIR}"
sudo chown "${USER}:${USER}" "${INSTALL_DIR}"

# Download
cd /tmp
sudo wget -q "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}.tar.gz"
sudo tar -xzf "signal-cli-${VERSION}.tar.gz" -C "${INSTALL_DIR}" --strip-components=1

# Create symlink
sudo ln -sf "${INSTALL_DIR}/bin/signal-cli" "${BIN_DIR}/signal-cli"

# Cleanup
sudo rm -f "/tmp/signal-cli-${VERSION}.tar.gz"

echo "✅ Signal CLI v${VERSION} installed to ${BIN_DIR}/signal-cli"
echo ""
echo "⚠️  NOTE: Gateway NOT restarted"
echo "   Jeremy should review, then run: sudo systemctl restart openclaw-gateway"
