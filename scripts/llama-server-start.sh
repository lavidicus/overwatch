#!/bin/bash
# Start llama-server daemon
launchctl load /Library/LaunchAgents/user.llama-server.plist
echo "llama-server started"
