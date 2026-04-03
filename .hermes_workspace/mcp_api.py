#!/usr/bin/env python3
"""Hermes API MCP - HTTP operations"""
import requests
import sys
import json
import argparse

def api_request(method, url, headers=None, data=None, cache=0):
    if headers is None:
        headers = {}
    
    if method == "GET":
        response = requests.get(url, headers=headers, timeout=30)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data, timeout=30)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data, timeout=30)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers, timeout=30)
    else:
        print(f"Unknown method: {method}")
        sys.exit(1)
    
    print(f"Status: {response.status_code}")
    if response.headers.get('content-type', '').startswith('application/json'):
        print(json.dumps(response.json(), indent=2))
    else:
        print(response.text)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("method", choices=["get", "post", "put", "delete"])
    parser.add_argument("url")
    parser.add_argument("--cache", type=int, default=0)
    parser.add_argument("-H", "--header", action="append", default=[])
    parser.add_argument("-d", "--data", type=str, default=None)
    args = parser.parse_args()
    
    headers = {}
    for h in args.header:
        key, value = h.split(":", 1)
        headers[key.strip()] = value.strip()
    
    data = None
    if args.data:
        try:
            data = json.loads(args.data)
        except:
            data = args.data
    
    api_request(args.method.upper(), args.url, headers, data, args.cache)
