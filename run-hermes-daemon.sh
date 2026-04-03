#!/bin/bash
cd /opt/hermes-agent
. venv/bin/activate
export HERMES_PROVIDER=ollama
export HERMES_MODEL=llamacpp
export OLLAMA_BASE_URL=http://olla:11434
export MATRIX_SERVER_URL=http://comms.9xc.io:8008
export MATRIX_USERNAME=herms
export MATRIX_PASSWORD=Ingalls2026!
exec nohup python -c "
import asyncio
from cli import HermesCLI

async def main():
    h = HermesCLI()
    await h.run()

asyncio.run(main())
" </dev/null &
wait
