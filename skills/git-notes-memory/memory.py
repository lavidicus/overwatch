#!/usr/bin/env python3
"""
Git-Notes Memory System
Structured memory storage for OpenClaw agent
"""

import sys
import os
import json
import re
from datetime import datetime
from pathlib import Path

# Configuration
WORKSPACE = os.environ.get('WORKSPACE', '/home/localadmin/.openclaw/workspace')
GIT_NOTES_DIR = os.path.join(WORKSPACE, 'memory', 'git-notes')
MEMORY_FILE = os.path.join(GIT_NOTES_DIR, 'memory.md')

# Importance levels
IMPORTANCE_LEVELS = {
    'c': 'critical',
    'h': 'high',
    'n': 'normal',
    'l': 'low'
}

def init_git_notes():
    """Initialize the git-notes directory structure"""
    os.makedirs(GIT_NOTES_DIR, exist_ok=True)
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'w') as f:
            f.write("# Git-Notes Memory\n\n")
            f.write("## Critical\n")
            f.write("## High\n")
            f.write("## Normal\n")
            f.write("## Low\n")
    print("✅ Git-Notes memory initialized")

def extract_entities(text):
    """Simple entity extraction from decision text"""
    entities = []
    
    # Look for common patterns
    patterns = [
        r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',  # Names
        r'\b\d+\.\d+\.\d+\b',  # Versions
        r'\b\d{4}-\d{2}-\d{2}\b',  # Dates
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, str(text))
        entities.extend(matches)
    
    return list(set(entities))

def remember(decision, tags=None, importance='h'):
    """Store a decision or memory"""
    os.makedirs(GIT_NOTES_DIR, exist_ok=True)
    
    # Extract entities from decision text
    if isinstance(decision, str):
        entities = extract_entities(decision)
    elif isinstance(decision, dict):
        entities = decision.get('tags', [])
    
    tags = tags or entities
    
    # Create memory entry
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'decision': decision,
        'tags': tags,
        'importance': IMPORTANCE_LEVELS.get(importance, 'high'),
        'entities': entities
    }
    
    # Append to file
    with open(MEMORY_FILE, 'a') as f:
        f.write(f"\n### {datetime.now().strftime('%Y-%m-%d %H:%M')} - {entry['importance'].upper()}\n")
        f.write(f"**Decision:** {json.dumps(decision, indent=2)}\n")
        if tags:
            f.write(f"**Tags:** {', '.join(tags)}\n")
        f.write(f"**Entities:** {', '.join(entities)}\n")
        f.write("\n")
    
    print(f"✅ Memory stored ({entry['importance']} priority)")
    return entry

def search(query, max_results=5):
    """Search memory by query"""
    if not os.path.exists(MEMORY_FILE):
        return []
    
    results = []
    with open(MEMORY_FILE, 'r') as f:
        content = f.read()
        if query.lower() in content.lower():
            results.append(content)
    
    return results[:max_results]

def list_memories(importance=None):
    """List all stored memories"""
    if not os.path.exists(MEMORY_FILE):
        print("No memories stored yet")
        return
    
    with open(MEMORY_FILE, 'r') as f:
        content = f.read()
        print(content)

def sync(start=True):
    """Sync memory at session start"""
    if start:
        print("🧠 Loading memory context...")
        if os.path.exists(MEMORY_FILE):
            with open(MEMORY_FILE, 'r') as f:
                content = f.read()
                # Return content for agent to use
                print(content[:2000])  # Limit output

def main():
    if len(sys.argv) < 2:
        print("Usage: memory.py <command> [options]")
        print("Commands: remember, search, list, sync")
        print("Example: memory.py remember \"Your decision here\" --importance h")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'remember':
        # Get decision text (everything after 'remember' that's not a flag)
        decision_parts = []
        tags = None
        importance = 'h'
        
        i = 2
        while i < len(sys.argv):
            arg = sys.argv[i]
            if arg == '--tags' or arg == '-t':
                i += 1
                if i < len(sys.argv):
                    tags = sys.argv[i].split(',')
            elif arg == '--importance' or arg == '-i':
                i += 1
                if i < len(sys.argv):
                    importance = sys.argv[i]
            elif not arg.startswith('-'):
                decision_parts.append(arg)
            i += 1
        
        if not decision_parts:
            print("❌ Error: 'remember' requires a decision text")
            sys.exit(1)
        
        remember(' '.join(decision_parts), tags, importance)
    
    elif command == 'search':
        query_parts = []
        max_results = 5
        i = 2
        while i < len(sys.argv):
            arg = sys.argv[i]
            if arg == '--query' or arg == '-q':
                i += 1
                if i < len(sys.argv):
                    query_parts.append(sys.argv[i])
            elif arg == '--max-results' or arg == '-m':
                i += 1
                if i < len(sys.argv):
                    max_results = int(sys.argv[i])
            elif not arg.startswith('-'):
                query_parts.append(arg)
            i += 1
        
        if not query_parts:
            print("❌ Error: 'search' requires a query")
            sys.exit(1)
        
        results = search(' '.join(query_parts), max_results)
        for result in results:
            print(result)
    
    elif command == 'list':
        list_memories()
    
    elif command == 'sync':
        sync(True)
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Commands: remember, search, list, sync")
        sys.exit(1)

if __name__ == '__main__':
    main()