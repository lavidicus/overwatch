#!/bin/bash
# ComfyUI video generation script

PROMPT="${1:-'beautiful naked woman laying on a bed, cinematic lighting, soft focus, high quality'}"
NEGATIVE="${2:-'blurry, low quality, distorted, ugly'}"
WIDTH=768
HEIGHT=512
FRAMES=64
STEPS=25
GUIDANCE=3.5
SEED=$((RANDOM % 1000000))

curl -s -X POST "http://127.0.0.1:8188/prompt" \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": {
      \"inputs\": [{
        \"class_type\": \"LTX23Video\",
        \"inputs\": {
          \"prompt\": \"$PROMPT\",
          \"negative_prompt\": \"$NEGATIVE\",
          \"steps\": $STEPS,
          \"guidance\": $GUIDANCE,
          \"seed\": $SEED,
          \"width\": $WIDTH,
          \"height\": $HEIGHT,
          \"frame_rate\": 24,
          \"num_frames\": $FRAMES
        }
      }]
    }
  }" | jq '.'
