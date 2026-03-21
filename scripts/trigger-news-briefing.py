#!/usr/bin/env python3
"""
Trigger OpenClaw News Briefing Session
Called by cron to spawn a session that fetches and sends news
"""

import subprocess
import sys
from datetime import datetime

DATE = datetime.now().strftime("%Y-%m-%d")
LOG_FILE = "/home/localadmin/.openclaw/logs/news-briefing.log"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\n")

try:
    log("Starting OpenClaw news briefing session trigger...")
    
    # Spawn a subagent session to run the briefing
    # This uses OpenClaw's sessions_spawn with runtime="acp"
    result = subprocess.run(
        [
            "sessions_spawn",
            "--label", f"news-briefing-{DATE}",
            "--runtime", "acp",
            "--task", f"Compile and send the 6AM CST morning news briefing using web_search and message tools. Fetch current news from AP, Reuters, BBC for {DATE}. Include top stories, international, and domestic news. Format as markdown and send to the current channel."
        ],
        capture_output=True,
        text=True,
        timeout=300
    )
    
    if result.returncode == 0:
        log("News briefing session spawned successfully")
        print(result.stdout)
    else:
        log(f"ERROR: Failed to spawn briefing session: {result.stderr}")
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    log("ERROR: Session spawn timed out")
    sys.exit(1)
except Exception as e:
    log(f"ERROR: {e}")
    sys.exit(1)
