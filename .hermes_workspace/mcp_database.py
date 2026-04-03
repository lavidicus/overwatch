#!/usr/bin/env python3
"""Hermes Database MCP - SQLite operations"""
import sqlite3
import sys

def query_db(sql, db="openclaw.db"):
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute(sql)
    results = cursor.fetchall()
    conn.close()
    return results

def schema_db(db="openclaw.db"):
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    conn.close()
    return tables

def list_dbs():
    import glob
    return glob.glob("*.db")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: mcp_database.py <command> [args]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    args = sys.argv[2:]
    
    if cmd == "query" and len(args) >= 1:
        results = query_db(args[0])
        for row in results:
            print(row)
    elif cmd == "schema" and len(args) >= 1:
        tables = schema_db(args[0])
        for table in tables:
            print(table[0])
    elif cmd == "list":
        dbs = list_dbs()
        for db in dbs:
            print(db)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
