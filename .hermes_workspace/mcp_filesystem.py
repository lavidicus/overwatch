#!/usr/bin/env python3
"""Hermes Filesystem MCP - Direct file operations"""
import os
import sys

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

def list_dir(path='.'):
    return os.listdir(path)

def search_files(pattern, path='.'):
    import glob
    return glob.glob(f"{path}/**/{pattern}", recursive=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: mcp_filesystem.py <command> [args]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    args = sys.argv[2:]
    
    if cmd == "read" and len(args) >= 1:
        print(read_file(args[0]))
    elif cmd == "write" and len(args) >= 2:
        write_file(args[0], " ".join(args[1:]))
        print(f"✅ Written to {args[0]}")
    elif cmd == "list" and len(args) >= 1:
        for item in list_dir(args[0]):
            print(item)
    elif cmd == "search" and len(args) >= 1:
        for match in search_files(args[0]):
            print(match)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
