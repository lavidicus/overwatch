#!/bin/bash
set -x
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y chromium chromium-browser
