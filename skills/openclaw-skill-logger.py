#!/usr/bin/env python3
"""
OpenClaw Skill Logger Hook - Automatic invocation tracking

This module integrates with OpenClaw's skill system to automatically log
every skill invocation. It works by hooking into the skill execution flow.
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Callable

# Configuration
WORKSPACE = Path("/home/localadmin/.openclaw/workspace")
SKILLS_DIR = WORKSPACE / "skills"
LOG_FILE = SKILLS_DIR / "execution-logs" / "skills-executions.jsonl"

# Add skills to path
sys.path.insert(0, str(SKILLS_DIR))

from execution_logger import log_skill_invocation

class SkillInvocationTracker:
    """Track and log all skill invocations in OpenClaw"""
    
    def __init__(self):
        self.log_file = LOG_FILE
        self.invocation_count = 0
        self.enabled = True
        self.active_skills = set()
        
        # Ensure log directory exists
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def log_invocation(
        self,
        skill_name: str,
        task_description: str = "skill_execution",
        trigger_context: str = "automatic",
        success: bool = True,
        error_message: Optional[str] = None,
        output_summary: str = "",
        tokens_used: int = 0,
        duration_ms: int = 0,
        metadata: Optional[Dict] = None
    ):
        """Log a skill invocation to the execution log"""
        if not self.enabled:
            return
        
        self.invocation_count += 1
        
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
            metadata=metadata or {"invocation_id": self.invocation_count}
        )
        
        status = "✅" if success else "❌"
        print(f"📊 [{self.invocation_count:04d}] {skill_name} - {status}")
    
    def wrap_skill_execution(self, skill_func: Callable, skill_name: str) -> Callable:
        """Decorator to wrap a skill function with logging"""
        def wrapped_skill(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = skill_func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                self.log_invocation(
                    skill_name=skill_name,
                    task_description=kwargs.get('task', 'skill_execution'),
                    trigger_context=kwargs.get('trigger', 'automatic'),
                    success=True,
                    output_summary=str(result)[:200] if result else "",
                    tokens_used=kwargs.get('tokens', 0),
                    duration_ms=duration_ms,
                    metadata={'args': str(args)[:100]}
                )
                
                return result
            
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                self.log_invocation(
                    skill_name=skill_name,
                    task_description=kwargs.get('task', 'skill_execution'),
                    trigger_context=kwargs.get('trigger', 'automatic'),
                    success=False,
                    error_message=str(e),
                    output_summary="Exception occurred",
                    duration_ms=duration_ms,
                    metadata={'args': str(args)[:100]}
                )
                
                raise
        
        return wrapped_skill
    
    def track_skill_invocation(self, skill_name: str, task: str = "skill_execution"):
        """Context manager to track skill invocation"""
        start_time = time.time()
        self.active_skills.add(skill_name)
        
        class SkillTracker:
            def __init__(tracker_self, tracker: 'SkillInvocationTracker', name: str, task: str, start: float):
                tracker_self._tracker = tracker
                tracker_self._name = name
                tracker_self._task = task
                tracker_self._start = start
            
            def __enter__(tracker_self):
                return tracker_self
            
            def __exit__(tracker_self, exc_type, exc_val, exc_tb):
                duration_ms = (time.time() - tracker_self._start) * 1000
                success = exc_type is None
                
                tracker_self._tracker.log_invocation(
                    skill_name=tracker_self._name,
                    task_description=tracker_self._task,
                    trigger_context="context_manager",
                    success=success,
                    error_message=str(exc_val) if exc_val else None,
                    output_summary="" if success else "Exception occurred",
                    duration_ms=duration_ms,
                    metadata={}
                )
                
                tracker_self._tracker.active_skills.discard(tracker_self._name)
        
        return SkillTracker(self, skill_name, task, start_time)

# Global tracker instance
tracker = SkillInvocationTracker()

# Decorator for easy use
def log_skill(skill_name: str):
    """Decorator to log a skill"""
    return tracker.wrap_skill_execution

# Auto-run when imported directly
if __name__ == "__main__":
    print("🔧 OpenClaw Skill Logger initialized")
    print(f"📁 Log file: {LOG_FILE}")
    print("✅ Ready to log skill invocations")
    
    # Test with a sample skill
    @log_skill("test-skill")
    def test_skill_func(task="test", trigger="manual"):
        return "Test success!"
    
    result = test_skill_func()
    print(f"Result: {result}")
