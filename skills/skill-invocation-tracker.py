#!/usr/bin/env python3
"""
Skill Invocation Wrapper - Automatically logs all skill executions

This wrapper intercepts skill invocations and logs them to the execution log.
Integrates with OpenClaw's skill system to provide automatic tracking.
"""

import json
import time
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Callable

# Add skills directory to path
skills_path = Path(__file__).parent
sys.path.insert(0, str(skills_path))

from execution_logger import SkillLogger, log_skill_invocation, SkillExecution

class SkillInvocationTracker:
    """Track and log all skill invocations"""
    
    def __init__(self, logger: Optional[SkillLogger] = None):
        self.logger = logger or SkillLogger()
        self.active_skills = set()
        self.invocation_stack = []
    
    def track_invocation(
        self,
        skill_name: str,
        task_description: str,
        trigger_context: str,
        user_input: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Callable:
        """
        Decorator/wrapper to track a skill invocation
        
        Usage:
            @tracker.track_invocation("self-improving", "Review memory", "user_request")
            def my_skill_function():
                ...
        """
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                # Log start
                self.invocation_stack.append({
                    'skill_name': skill_name,
                    'start_time': start_time,
                    'task': task_description
                })
                
                try:
                    # Execute the skill
                    result = func(*args, **kwargs)
                    
                    # Calculate metrics
                    duration_ms = (time.time() - start_time) * 1000
                    tokens_used = self._estimate_tokens(str(result))
                    
                    # Log success
                    log_skill_invocation(
                        skill_name=skill_name,
                        task_description=task_description,
                        trigger_context=trigger_context,
                        success=True,
                        tool_calls=[],  # Would need to track actual tool calls
                        output_summary=str(result)[:200],
                        tokens_used=tokens_used,
                        duration_ms=duration_ms,
                        metadata=metadata or {}
                    )
                    
                    return result
                
                except Exception as e:
                    # Log failure
                    duration_ms = (time.time() - start_time) * 1000
                    tokens_used = self._estimate_tokens(str(e))
                    
                    log_skill_invocation(
                        skill_name=skill_name,
                        task_description=task_description,
                        trigger_context=trigger_context,
                        success=False,
                        error_message=str(e),
                        tool_calls=[],
                        output_summary="Exception occurred",
                        tokens_used=tokens_used,
                        duration_ms=duration_ms,
                        metadata=metadata or {}
                    )
                    
                    raise
            
            return wrapper
        return decorator
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimate (1 token ≈ 4 characters)"""
        return len(text) // 4
    
    def log_manual_invocation(
        self,
        skill_name: str,
        task_description: str,
        trigger_context: str,
        success: bool,
        error_message: Optional[str] = None,
        output_summary: str = "",
        tokens_used: int = 0,
        duration_ms: int = 0,
        metadata: Optional[Dict] = None
    ):
        """Log a skill invocation manually (for non-decorated skills)"""
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
            metadata=metadata or {}
        )

# Global tracker instance
tracker = SkillInvocationTracker()

# Convenience decorator
def track_skill(skill_name: str, task_description: str, trigger_context: str):
    """Decorator to track a skill"""
    return tracker.track_invocation(skill_name, task_description, trigger_context)

if __name__ == "__main__":
    # Test the tracker
    print("🧪 Testing skill invocation tracker...")
    
    @track_skill("test-skill", "Test task", "manual")
    def test_skill():
        return "Test success!"
    
    result = test_skill()
    print(f"Result: {result}")
    
    # Check log
    log_file = Path("skills/execution-logs/skills-executions.jsonl")
    if log_file.exists():
        with open(log_file, 'r') as f:
            lines = f.readlines()
            print(f"✅ Logged {len(lines)} executions")
