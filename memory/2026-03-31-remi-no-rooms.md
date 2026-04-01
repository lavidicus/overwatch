# Matrix Fix - remi No Joined Rooms

**Date:** 2026-03-31 12:30 UTC  
**Host:** remi  
**Issue:** Matrix logged in but ZERO joined rooms

## Root Cause

remi's Matrix account is logged in but has **no joined rooms** on the server. The Matrix client syncs successfully but finds nothing to sync messages from.

## Solution

**Lavid needs to send a direct message to @remi in Element:**

1. Open Element on Lavid's device
2. Create a new DM to `@remi:comms.9xc.io`
3. Send a test message

This will:
- Create a DM room between Lavid and remi
- Invite remi to the room
- remi's Matrix sync will pick up the room and auto-join
- Messages will be decrypted normally

## Why This Works

The Matrix SDK's `groupPolicy: "open"` config should auto-join rooms, but it requires the room to exist first. Sending a DM from Lavid creates the room and invites remi.

## Alternative

If Lavid already sent a DM to remi earlier, remi might have missed the invite. Lavid should:
1. Go to the existing DM with remi
2. Open room settings
3. "Invite people" → type @remi
4. Send invite

## Next

After Lavid sends the DM/invite, remi should automatically join and start receiving messages.
