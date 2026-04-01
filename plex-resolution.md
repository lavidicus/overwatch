# Plex Remote Streaming - Final Resolution (2026-03-31)

## Issue Summary
- Client: iPhone + Android/Fire Stick streaming HEVC/H.265 files via WAN
- Symptoms: Buffering every 3-5 seconds, "Not enough CPU for conversion"
- Root cause: **WAN WiFi bandwidth + codec incompatibility**

## Diagnosis
✅ **Direct connection active** (not relay) - public IP `64.20.43.204` → `10.50.15.171:32400`
✅ **Remote bandwidth OK** - 7 Mbps average (within 8 Mbps limit)
❌ **Transcoding bottleneck** - CPU can't keep up with real-time H.265→H.264 conversion
❌ **WiFi bandwidth** - Too slow for smooth streaming (30 Mbps claimed, actual lower)

## Files Affected
- Bubble Guppies (H.265 in MKV)
- America the Story of Us (H.265 in MKV)

## Fixes Applied
1. **IP `12.75.29.84` blocked** - Persistent iptables rule
2. **Plex service restarted** - Clean state
3. **Direct connection verified** - Green checkmark in Remote Access

## Final Solution
- **Turned transcoding back ON** - CPU can handle it now
- **Moved off rental WiFi** - Better bandwidth for streaming
- **Direct connection working** - Not using relay

## Recommendation
For permanent fix:
1. Install **VLC** on Fire Stick/iPhone (native H.265/MKV support)
2. OR convert files once to H.264/AAC (one-time cost)
3. OR upgrade rental WiFi to actual 30+ Mbps stable

**Status:** ✅ Streaming working after WiFi change + transcoding enabled

**Date:** 2026-03-31 03:24 UTC
