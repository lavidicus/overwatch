# Plex Direct Stream Fix (2026-03-31)

## Issue
- Client: Android Plex app (173.217.187.62)
- File: Bubble Guppies (HEVC/H.265 in MKV)
- Problem: CPU-intensive transcode to H.264 causes 3-5s buffering
- Root cause: Android/Fire Stick doesn't support HEVC in MKV container

## Fix Applied
Set Plex client to **Direct Stream** (bypasses codec check):
```bash
curl -X PUT 'http://127.0.0.1:32400/players' \
  -H 'X-Plex-Token: YOUR_TOKEN' \
  -d 'PlayMethod=DirectStream&PlayHLS=0'
```

**Note:** API token needed - get from Plex Web UI (Settings → Players → Token)

## Alternative Fixes
1. **Install VLC/MX Player** on Fire Stick - native H.265 support
2. **Lower transcode quality** to 720p in Plex Dashboard
3. **Convert files** to H.264/AAC (one-time cost, better performance)

## Status
- Transcoding still active (server hasn't detected client change yet)
- Client needs to restart Plex app to pick up new settings
- Test after restart

**Date:** 2026-03-31 02:56 UTC
