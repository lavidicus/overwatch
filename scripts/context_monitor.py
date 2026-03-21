#!/usr/bin/env python3
"""Context window monitor - writes to file at 90%, compacts at 95%"""

import json
import os
import sys
from datetime import datetime

CONTEXT_MAX = 262000
ALERT_THRESHOLD = int(CONTEXT_MAX * 0.90)  # 235k
COMPACT_THRESHOLD = int(CONTEXT_MAX * 0.95)  # 249k

# Check if context is being passed via environment or argument
def get_context_size():
    # Try to read from session_status output
    if len(sys.argv) > 1:
        return int(sys.argv[1])
    return 0

def write_to_memory(context_size):
    """Write important context to daily memory file"""
    date_file = f"/home/localadmin/.openclaw/workspace/memory/{datetime.now():%Y-%m-%d}.md"
    
    # Check if file exists
    if not os.path.exists(date_file):
        # Create new file with header
        with open(date_file, 'w') as f:
            f.write(f"# {datetime.now():%Y-%m-%d} - Session Log\n\n")
            f.write(f"**Time:** {datetime.now():%H:%M UTC} | **Session:** Bootstrap\n\n")
            f.write("## Context Alert\n\n")
    
    # Append to existing file
    with open(date_file, 'a') as f:
        f.write(f"### Context Window Alert - {datetime.now():%H:%M UTC}\n")
        f.write(f"- **Current tokens:** {context_size:,}/{CONTEXT_MAX:,} ({context_size/CONTEXT_MAX*100:.1f}%)\n")
        f.write(f"- **Threshold:** {ALERT_THRESHOLD:,} tokens (90%)\n")
        f.write(f"- **Action:** Writing context to memory for compaction\n\n")
        f.write("---\n\n")

def compact_context():
    """Trigger compaction - this would be called via API or manual command"""
    compact_file = "/home/localadmin/.openclaw/workspace/context-to-compact.md"
    
    with open(compact_file, 'w') as f:
        f.write(f"# Context Compaction Trigger\n\n")
        f.write(f"**Time:** {datetime.now():%Y-%m-%d %H:%M UTC}\n")
        f.write(f"**Threshold:** {COMPACT_THRESHOLD:,} tokens (95%)\n\n")
        f.write("## Instructions\n\n")
        f.write("1. Review recent decisions, learnings, and context\n")
        f.write("2. Write to `memory/YYYY-MM-DD.md`\n")
        f.write("3. Execute compaction command\n\n")
        f.write("---\n\n")
        f.write("## Session Context Summary\n\n")
        # This would be populated by the session
        f.write("*To be filled by session*\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: context_monitor.py <context_size>")
        sys.exit(1)
    
    context_size = int(sys.argv[1])
    percentage = context_size / CONTEXT_MAX * 100
    
    if context_size >= COMPACT_THRESHOLD:
        print(f"⚠️  COMPACT: {context_size:,}/{CONTEXT_MAX:,} ({percentage:.1f}%)")
        compact_context()
    elif context_size >= ALERT_THRESHOLD:
        print(f"📝 ALERT: {context_size:,}/{CONTEXT_MAX:,} ({percentage:.1f}%)")
        write_to_memory(context_size)
    else:
        print(f"✅ OK: {context_size:,}/{CONTEXT_MAX:,} ({percentage:.1f}%)")
