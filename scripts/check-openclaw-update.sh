#!/bin/bash
# OpenClaw Update Checker - Runs daily at 8 AM CST
# Checks GitHub for new releases and alerts if a newer version exists

set -e

LOG_FILE="$HOME/.openclaw/logs/update-checker.log"
MEMORY_DIR="$HOME/.openclaw/workspace/memory"
DATE=$(date +%Y-%m-%d)

# Create log directory if needed
mkdir -p "$(dirname $LOG_FILE)"

# Start logging
echo "=== OpenClaw Update Check - $(date) ===" >> $LOG_FILE

# Get current installed version
INSTALLED_VERSION=$(openclaw version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
if [ -z "$INSTALLED_VERSION" ]; then
    INSTALLED_VERSION="unknown"
fi

echo "Current version: $INSTALLED_VERSION" >> $LOG_FILE

# Fetch latest release from GitHub
LATEST_VERSION=$(curl -s "https://api.github.com/repos/openclaw/openclaw/releases/latest" | grep '"tag_name"' | sed 's/.*: "\(.*\)".*/\1/')

echo "Latest version: $LATEST_VERSION" >> $LOG_FILE

# Compare versions (simple string comparison for now)
if [ "$INSTALLED_VERSION" != "$LATEST_VERSION" ]; then
    echo "NEW UPDATE AVAILABLE!" >> $LOG_FILE
    echo "From: $INSTALLED_VERSION" >> $LOG_FILE
    echo "To: $LATEST_VERSION" >> $LOG_FILE
    
    # Get release notes
    RELEASE_NOTES=$(curl -s "https://api.github.com/repos/openclaw/openclaw/releases/latest" | grep '"body"' | sed 's/.*: "\(.*\)".*/\1/' | head -200)
    
    echo "" >> $LOG_FILE
    echo "Release Notes:" >> $LOG_FILE
    echo "$RELEASE_NOTES" >> $LOG_FILE
    
    # Create alert message
    ALERT_MSG="🔄 **OpenClaw Update Available**

**Current:** $INSTALLED_VERSION  
**Latest:** $LATEST_VERSION

**Changelog:**
$(echo "$RELEASE_NOTES" | head -50)

Run \`openclaw update\` to upgrade."
    
    echo "" >> $LOG_FILE
    echo "Alert sent:" >> $LOG_FILE
    echo "$ALERT_MSG" >> $LOG_FILE
    
    # Update memory file
    mkdir -p "$MEMORY_DIR"
    echo "" >> $MEMORY_DIR/${DATE}.md
    echo "### 🔄 OpenClaw Update Alert" >> $MEMORY_DIR/${DATE}.md
    echo "" >> $MEMORY_DIR/${DATE}.md
    echo "**From:** $INSTALLED_VERSION" >> $MEMORY_DIR/${DATE}.md
    echo "**To:** $LATEST_VERSION" >> $MEMORY_DIR/${DATE}.md
    echo "" >> $MEMORY_DIR/${DATE}.md
    echo "$ALERT_MSG" >> $MEMORY_DIR/${DATE}.md
    
else
    echo "Up to date!" >> $LOG_FILE
fi

echo "=== Update Check Complete - $(date) ===" >> $LOG_FILE
