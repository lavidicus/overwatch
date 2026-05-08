---
date: 2026-05-06
tags: gpu, metrics, baseline, node2
category: numbers
---

# GPU Metrics Baseline

## Current State (2026-05-06)
- GPU 0: 40°C, 65W, 0% util, 21631/24576 MiB
- GPU 1: 34°C, 64W, 0% util, 22835/24576 MiB
- Both GPUs idle, temps normal
- VRAM usage: ~87% per GPU

## Historical Context
- Peak temperatures: 75°C/73°C under load
- Idle power: ~65W per GPU
- Load power: ~250W per GPU (max)
- Compute utilization: 0% when idle, varies under load

## Implications
- Baseline power consumption: ~130W total for both GPUs
- Thermal headroom: ~35°C before thermal throttling
- VRAM utilization: High even when idle, suggests model caching
