#!/usr/bin/env python3
import asyncio
import sys
sys.path.insert(0, '/opt/hermes-agent')

from cli import HermesCLI

async def main():
    h = HermesCLI()
    await h.connect()
    await h.send_message("@lavid:comms.9xc.io", "Hello from Hermes! I'm your AI assistant ready to help. How can I assist you today?")
    await h.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
