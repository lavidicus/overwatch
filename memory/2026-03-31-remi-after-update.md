# remi Matrix Fix - After Update

**Date:** 2026-03-31 22:05 UTC  
**Host:** remi  
**Status:** ✅ Updated to v31, but still needs room join

## Update Status

- ✅ OpenClaw v2026.3.31 installed
- ✅ Gateway running (PID 154537)
- ✅ Matrix enabled and configured
- ✅ Account `@remi:comms.9xc.io` active
- ❌ **Still 0 joined rooms**
- ⚠️ Crypto bootstrap warning (expected after update)

## Issue

remi's Matrix SDK has synced but hasn't joined any rooms yet. The update didn't automatically fix the room membership issue.

## Fix

**Option 1: Lavid DMs remi** (recommended)
- Send a DM to `@remi:comms.9xc.io`
- Creates the room
- remi auto-joins
- Messages flow

**Option 2: Force room discovery**
- Clear crypto store again
- Force full sync
- remi discovers room invites

**Option 3: Manual join via API**
- Use OpenClaw to programmatically join remi

## Next

**Have Lavid send a DM to @remi** to create the room and trigger the join.

**Source:** `memory/2026-03-31-remi-status.md`
