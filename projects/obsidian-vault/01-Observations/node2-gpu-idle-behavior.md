---
date: 2026-05-06
tags: node2, gpu, llama-server, monitoring
category: observation
---

# Node2 GPU Idle Behavior

## Observation
- Both P6000 GPUs idle at ~65W power draw
- VRAM usage consistently ~87% (21-22GB/24GB per GPU)
- llama-server PID 1012 holding VRAM but 0% compute utilization
- Temperatures vary significantly: 34-43°C idle, up to 75°C under load
- GPU 0 consistently 2-5°C hotter than GPU 1

## Implications
- High VRAM occupancy suggests model is loaded but not being queried
- Idle power draw of 65W per GPU is significant for cost tracking
- Temperature variance between GPUs suggests possible cooling asymmetry
- Model loading pattern: likely loading to VRAM on startup, not lazy-loading

## Related
- [[node2-cost-tracking]]
- [[llama-server-optimization]]
