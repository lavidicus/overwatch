#!/bin/bash
set -x
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y chromium chromium-browser
