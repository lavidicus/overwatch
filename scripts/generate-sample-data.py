#!/usr/bin/env python3
"""
Test script to generate sample execution data for testing the analysis system
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

LOG_FILE = Path("skills/execution-logs/skills-executions.jsonl")

# Generate sample data for testing
sample_executions = [
    # Successful executions
    {
        "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Review memory updates",
        "trigger_context": "user_request",
        "success": True,
        "error_message": None,
        "tool_calls": ["read", "edit"],
        "output_summary": "Memory updated successfully",
        "tokens_used": 2500,
        "duration_ms": 3200,
        "user_feedback": None,
        "metadata": {"session_id": "main"}
    },
    {
        "timestamp": (datetime.now() - timedelta(hours=4)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Update corrections log",
        "trigger_context": "user_correction",
        "success": True,
        "error_message": None,
        "tool_calls": ["read", "write"],
        "output_summary": "Corrections logged",
        "tokens_used": 1800,
        "duration_ms": 2100,
        "user_feedback": "Good work",
        "metadata": {"session_id": "main"}
    },
    {
        "timestamp": (datetime.now() - timedelta(hours=6)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Generate weekly report",
        "trigger_context": "heartbeat",
        "success": True,
        "error_message": None,
        "tool_calls": ["read", "write"],
        "output_summary": "Report generated",
        "tokens_used": 3000,
        "duration_ms": 4500,
        "user_feedback": None,
        "metadata": {"session_id": "main"}
    },
    # Failed executions
    {
        "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Update memory after session",
        "trigger_context": "user_request",
        "success": False,
        "error_message": "File write failed - permission denied",
        "tool_calls": ["read", "write"],
        "output_summary": "Failed to update memory",
        "tokens_used": 500,
        "duration_ms": 800,
        "user_feedback": "No, that's wrong",
        "metadata": {"session_id": "main"}
    },
    {
        "timestamp": (datetime.now() - timedelta(hours=3)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Review corrections",
        "trigger_context": "user_correction",
        "success": False,
        "error_message": "Context window exceeded limit",
        "tool_calls": ["read"],
        "output_summary": "Context overflow",
        "tokens_used": 65000,
        "duration_ms": 12000,
        "user_feedback": "You ran out of context",
        "metadata": {"session_id": "main"}
    },
    {
        "timestamp": (datetime.now() - timedelta(hours=5)).isoformat(),
        "skill_name": "self-improving",
        "task_description": "Generate improvement proposal",
        "trigger_context": "auto_improvement",
        "success": False,
        "error_message": "Tool call failed - API timeout",
        "tool_calls": ["read", "write"],
        "output_summary": "Timeout error",
        "tokens_used": 1200,
        "duration_ms": 30000,
        "user_feedback": None,
        "metadata": {"session_id": "main"}
    }
]

# Write to JSONL file
with open(LOG_FILE, 'w') as f:
    for exec_data in sample_executions:
        f.write(json.dumps(exec_data) + '\n')

print(f"✅ Generated {len(sample_executions)} sample executions")
print(f"📁 Log file: {LOG_FILE}")
print(f"   - Successful: {sum(1 for e in sample_executions if e['success'])}")
print(f"   - Failed: {sum(1 for e in sample_executions if not e['success'])}")
