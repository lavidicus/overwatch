#!/bin/bash
# Stop llama-server daemon
launchctl unload /Library/LaunchAgents/user.llama-server.plist
echo "llama-server stopped"
