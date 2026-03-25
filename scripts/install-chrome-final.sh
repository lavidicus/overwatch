#!/bin/bash
set -e
echo "Installing Chromium..."
apt-get update -qq
apt-get install -y chromium chromium-browser
echo "Done!"
