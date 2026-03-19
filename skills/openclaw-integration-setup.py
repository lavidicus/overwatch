#!/usr/bin/env python3
"""
OpenClaw Skill Integration Setup - Create wrapper and documentation
"""

from pathlib import Path

# Configuration
SKILLS_DIR = Path(__file__).parent

# Create wrapper script
wrapper_code = """#!/usr/bin/env python3
\"\"\"
Skill Invocation Logger - OpenClaw Integration
\"\"\"

import json
import sys
import time
from pathlib import Path
from datetime import datetime

# Add workspace skills to path
workspace_skills = Path("/home/localadmin/.openclaw/workspace/skills")
sys.path.insert(0, str(workspace_skills))

from execution_logger import log_skill_invocation

# Global state
invocation_count = 0

def log_skill_call(
    skill_name: str,
    task_description: str,
    trigger_context: str,
    success: bool,
    error_message: str = None,
    output_summary: str = "",
    tokens_used: int = 0,
    duration_ms: int = 0,
    metadata: dict = None
):
    \"\"\"Log a skill invocation to the execution log\"\"\"
    global invocation_count
    
    invocation_count += 1
    
    log_skill_invocation(
        skill_name=skill_name,
        task_description=task_description,
        trigger_context=trigger_context,
        success=success,
        error_message=error_message,
        tool_calls=[],
        output_summary=output_summary,
        tokens_used=tokens_used,
        duration_ms=duration_ms,
        metadata=metadata or {"invocation_id": invocation_count}
    )
    
    print(f"Skill logged: {skill_name} - {'Success' if success else 'Failed'}")

if __name__ == "__main__":
    print("Skill Invocation Logger initialized")
    print("Ready to log skill invocations")
"""

wrapper_path = SKILLS_DIR / "openclaw-skill-wrapper.py"

with open(wrapper_path, 'w') as f:
    f.write(wrapper_code)

print(f"Created wrapper: {wrapper_path}")

# Create integration guide
integration_doc = """# OpenClaw Skill Integration Guide

## How to Enable Automatic Skill Logging

### Option 1: Pre-load Wrapper (Recommended)

Before starting OpenClaw:
```bash
cd /home/localadmin/.openclaw/workspace
python3 skills/openclaw-skill-wrapper.py
openclaw gateway start
```

### Option 2: Manual Integration

Edit `~/.openclaw/openclaw.json`:
```json
"hooks.internal.entries": {
  "skill-logger": {
    "enabled": true,
    "script": "skills/openclaw-skill-wrapper.py"
  }
}
```

## Monitoring

Check skill performance:
```bash
python3 scripts/analyze-skill-performance.py
```

View latest report:
```bash
cat reports/skill-health-$(date +%Y-%m-%d).md
```

## Data Location

- Logs: `skills/execution-logs/skills-executions.jsonl`
- Reports: `reports/skill-health-YYYY-MM-DD.md`
- Versions: `skills/versioned/{skill_name}/`
"""

doc_path = SKILLS_DIR / "INTEGRATION_GUIDE.md"

with open(doc_path, 'w') as f:
    f.write(integration_doc)

print(f"Created guide: {doc_path}")
print("Integration files created!")
