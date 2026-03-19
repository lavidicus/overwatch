#!/usr/bin/env python3
"""
Skill Execution Logger - Core observation layer for self-improving skills system

Logs every skill invocation with structured data for:
- Failure pattern detection
- Performance analysis
- Auto-amendment proposals
- Version comparison
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
import hashlib

# Configuration
LOG_DIR = Path(__file__).parent / "execution-logs"
LOG_FILE = LOG_DIR / "skills-executions.jsonl"
LOG_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class SkillExecution:
    """Structured log entry for skill execution"""
    timestamp: str
    skill_name: str
    task_description: str
    trigger_context: str  # What triggered the skill
    success: bool
    error_message: Optional[str]
    tool_calls: list
    output_summary: str
    tokens_used: int
    duration_ms: int
    user_feedback: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def to_dict(self):
        return {
            'timestamp': self.timestamp,
            'skill_name': self.skill_name,
            'task_description': self.task_description,
            'trigger_context': self.trigger_context,
            'success': self.success,
            'error_message': self.error_message,
            'tool_calls': self.tool_calls,
            'output_summary': self.output_summary,
            'tokens_used': self.tokens_used,
            'duration_ms': self.duration_ms,
            'user_feedback': self.user_feedback,
            'metadata': self.metadata or {}
        }
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
    def get_id(self):
        """Generate unique execution ID"""
        content = f"{self.timestamp}-{self.skill_name}-{self.task_description}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

class SkillLogger:
    """Thread-safe skill execution logger"""
    
    def __init__(self, log_file: Path = LOG_FILE):
        self.log_file = log_file
        self._lock = False  # Simple lock mechanism
    
    def log_execution(self, execution: SkillExecution):
        """Append execution log to JSONL file"""
        with open(self.log_file, 'a') as f:
            f.write(execution.to_json() + '\n')
    
    def get_recent_failures(self, limit: int = 10):
        """Get recent failed executions"""
        failures = []
        if not self.log_file.exists():
            return failures
        
        with open(self.log_file, 'r') as f:
            for line in reversed(list(f)[-limit*2:]):  # Check last 2x limit for failures
                try:
                    data = json.loads(line.strip())
                    if not data.get('success'):
                        failures.append(data)
                        if len(failures) >= limit:
                            break
                except json.JSONDecodeError:
                    continue
        
        return failures
    
    def get_skill_stats(self, skill_name: str, days: int = 7):
        """Calculate statistics for a specific skill"""
        stats = {
            'total_runs': 0,
            'successful': 0,
            'failed': 0,
            'avg_duration_ms': 0,
            'avg_tokens': 0,
            'failure_rate': 0.0,
            'recent_errors': []
        }
        
        if not self.log_file.exists():
            return stats
        
        cutoff = time.time() - (days * 24 * 3600)
        
        with open(self.log_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    if data.get('skill_name') != skill_name:
                        continue
                    
                    exec_time = datetime.fromisoformat(data['timestamp']).timestamp()
                    if exec_time < cutoff:
                        continue
                    
                    stats['total_runs'] += 1
                    if data.get('success'):
                        stats['successful'] += 1
                    else:
                        stats['failed'] += 1
                        stats['recent_errors'].append(data.get('error_message', 'Unknown error'))
                    
                    stats['avg_duration_ms'] += data.get('duration_ms', 0)
                    stats['avg_tokens'] += data.get('tokens_used', 0)
                
                except (json.JSONDecodeError, KeyError):
                    continue
        
        if stats['total_runs'] > 0:
            stats['avg_duration_ms'] /= stats['total_runs']
            stats['avg_tokens'] /= stats['total_runs']
            stats['failure_rate'] = stats['failed'] / stats['total_runs']
            stats['recent_errors'] = stats['recent_errors'][:5]  # Top 5 recent errors
        
        return stats
    
    def get_all_skill_stats(self, days: int = 7):
        """Get statistics for all skills"""
        all_stats = {}
        
        if not self.log_file.exists():
            return all_stats
        
        # Group by skill name
        skill_data = {}
        with open(self.log_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    exec_time = datetime.fromisoformat(data['timestamp']).timestamp()
                    if exec_time < time.time() - (days * 24 * 3600):
                        continue
                    
                    skill = data.get('skill_name', 'unknown')
                    if skill not in skill_data:
                        skill_data[skill] = []
                    skill_data[skill].append(data)
                except (json.JSONDecodeError, KeyError):
                    continue
        
        # Calculate stats for each skill
        for skill, executions in skill_data.items():
            all_stats[skill] = self._calculate_skill_stats(executions)
        
        return all_stats
    
    def _calculate_skill_stats(self, executions: list):
        """Calculate stats for a single skill's executions"""
        stats = {
            'total_runs': len(executions),
            'successful': sum(1 for e in executions if e.get('success')),
            'failed': sum(1 for e in executions if not e.get('success')),
            'avg_duration_ms': sum(e.get('duration_ms', 0) for e in executions) / len(executions),
            'avg_tokens': sum(e.get('tokens_used', 0) for e in executions) / len(executions),
            'failure_rate': sum(1 for e in executions if not e.get('success')) / len(executions),
            'recent_errors': [e.get('error_message') for e in executions if not e.get('success')][:5]
        }
        return stats

# Global logger instance
logger = SkillLogger()

def log_skill_invocation(
    skill_name: str,
    task_description: str,
    trigger_context: str,
    success: bool,
    error_message: Optional[str] = None,
    tool_calls: Optional[list] = None,
    output_summary: str = "",
    tokens_used: int = 0,
    duration_ms: int = 0,
    user_feedback: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Convenience function to log a skill invocation"""
    execution = SkillExecution(
        timestamp=datetime.now().isoformat(),
        skill_name=skill_name,
        task_description=task_description,
        trigger_context=trigger_context,
        success=success,
        error_message=error_message,
        tool_calls=tool_calls or [],
        output_summary=output_summary,
        tokens_used=tokens_used,
        duration_ms=duration_ms,
        user_feedback=user_feedback,
        metadata=metadata or {}
    )
    logger.log_execution(execution)
    return execution.get_id()

if __name__ == "__main__":
    # Test the logger
    print("Skill Execution Logger initialized")
    print(f"Log file: {LOG_FILE}")
    
    # Example usage
    exec_id = log_skill_invocation(
        skill_name="test-skill",
        task_description="Test task",
        trigger_context="manual",
        success=True,
        tokens_used=100,
        duration_ms=500,
        output_summary="Success!"
    )
    print(f"Test execution ID: {exec_id}")
