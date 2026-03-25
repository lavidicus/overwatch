#!/usr/bin/env bash
# Setup Google Workspace (gog) skill for OpenClaw
# Configures gog CLI with your workspace account

set -e

echo "🦀 Setting up Google Workspace (gog) skill for ops@claw-sync.com"
echo ""

# Step 1: Install gog CLI if not present
echo "Step 1: Installing gog CLI..."
if ! command -v gog &> /dev/null; then
    echo "Installing gog via npm..."
    npm install -g gogcli 2>/dev/null || brew install steipete/tap/gogcli 2>/dev/null || echo "gog CLI needs manual installation"
fi

# Step 2: Create config directory
echo "Step 2: Creating config directory..."
mkdir -p ~/.openclaw/config/google

# Step 3: Get OAuth credentials
echo ""
echo "Step 3: Getting OAuth credentials from Google..."
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Create OAuth 2.0 Client ID"
echo "3. Select 'Web application'"
echo "4. Add redirect URI: http://localhost:8080"
echo "5. Download JSON credentials file"
echo "6. Save to: ~/.openclaw/config/google/client_secret.json"
echo ""
read -p "Press Enter after saving credentials..."

# Step 4: Configure gog with credentials
echo "Step 4: Configuring gog with credentials..."
gog auth credentials ~/.openclaw/config/google/client_secret.json

# Step 5: Add your workspace account
echo ""
echo "Step 5: Adding workspace account (ops@claw-sync.com)..."
echo "You'll be prompted to login in your browser"
gog auth add ops@claw-sync.com --services gmail,calendar,drive,contacts,docs,sheets

# Step 6: Verify setup
echo ""
echo "Step 6: Verifying setup..."
gog auth list

echo ""
echo "✅ gog skill setup complete!"
echo ""
echo "Quick test:"
echo "  gog gmail search 'newer_than:1d' --max 5"
echo "  gog calendar events --from today --to tomorrow"
echo ""
