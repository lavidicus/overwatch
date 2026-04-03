#!/bin/bash
cd /opt/hermes-agent
. venv/bin/activate
exec hermes gateway run
