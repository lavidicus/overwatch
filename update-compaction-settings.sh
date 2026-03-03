#!/bin/bash
# Update OpenClaw compaction settings
# This script updates the reserveTokens from 20000 to 40000 for better context window guardrails

CONFIG_FILE="/home/localadmin/.openclaw/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "Updating compaction settings in $CONFIG_FILE..."

# Use Python for reliable JSON manipulation
python3 << 'PYTHON'
import json

config_file = "/home/localadmin/.openclaw/openclaw.json"

with open(config_file, 'r') as f:
    config = json.load(f)

# Update compaction settings
if 'agents' in config and 'defaults' in config['agents'] and 'compaction' in config['agents']['defaults']:
    old_reserve = config['agents']['defaults']['compaction'].get('reserveTokens', 20000)
    config['agents']['defaults']['compaction']['reserveTokens'] = 40000
    print(f"✅ Updated reserveTokens: {old_reserve} → 40000")
else:
    print("⚠️  Compaction settings not found in expected location")
    print("Current config structure:", json.dumps(config.get('agents', {}), indent=2))

with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Config updated successfully")
PYTHON

echo ""
echo "New compaction settings:"
python3 << 'PYTHON'
import json
with open("/home/localadmin/.openclaw/openclaw.json", 'r') as f:
    config = json.load(f)
print(json.dumps(config.get('agents', {}).get('defaults', {}).get('compaction', {}), indent=2))
PYTHON

echo ""
echo "⚠️  Note: OpenClaw will pick up new config on next session start"