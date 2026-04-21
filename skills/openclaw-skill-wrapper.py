#!/usr/bin/env python3
"""
Skill Invocation Logger - OpenClaw Integration
"""

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
    """Log a skill invocation to the execution log"""
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
