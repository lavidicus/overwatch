# Stable Diffusion Image Generation

Generate images using stable-diffusion.cpp on Node2 GPU (Quadro P6000).

## Usage
When user asks to generate/create/make/draw an image:
1. Run `generate-image.sh` on node2 with the prompt
2. Wait for output (SD 1.5: ~4 min for 20 steps at 512x512)
3. Return the image to user via MEDIA attachment

## Parameters
- Prompt: user's description (required)
- Size: default 512x512
- Steps: default 20 (higher = better quality, max 50)
- Seed: random if not specified
- Model: SD 1.5 (default)

## Script
Run on node2:
```bash
ssh localadmin@node2 'bash -s' -- <prompt> [--width 512] [--height 512] [--steps 20] [--seed 42]
```

Or use the helper script:
```bash
ssh localadmin@node2 'bash /home/localadmin/scripts/sd-generate.sh "<prompt>" 512 512 20'
```

Output goes to: `/home/localadmin/projects/sd-output/image_YYYYMMDD_HHMMSS.png`

## Performance
- SD 1.5 @ 512x512, 20 steps: ~220s on P6000
- SD 1.5 @ 512x512, 10 steps: ~110s
- SD 1.5 @ 1024x1024, 20 steps: ~440s
- Model: `/home/localadmin/projects/sd-models/v1-5-pruned-emaonly.safetensors`

## Notes
- Stops llama.cpp during generation (~3s downtime), restarts after
- VRAM usage: ~2.7 GB for model + generation overhead
- Both GPUs on node2 are idle but VRAM-heavy with llama.cpp — SD runs fine on GPU 0
