# Node2 GPU Metrics — 2026-04-18 08:16 UTC

## Script Run
`/home/localadmin/scripts/node1-metrics-scraper.sh` executed successfully on node2.

## GPU Stats (nvidia-smi)

| GPU | Name | Temp (°C) | Power Draw (W) | Power Limit (W) | VRAM Used (MB) | VRAM Total (MB) | GPU Util % | Mem Util % |
|-----|------|-----------|----------------|-----------------|----------------|-----------------|------------|------------|
| 0 | Quadro P6000 | 41 | 65.69 | 250 | 23,133 | 24,576 | 0 | 0 |
| 1 | Quadro P6000 | 35 | 63.94 | 250 | 19,965 | 24,576 | 0 | 0 |

## Observations
- **Both GPUs idle** — 0% utilization, no compute workloads running
- **VRAM nearly full** — GPU0: ~94%, GPU1: ~81% (likely residual from prior model inference or cached allocations)
- **Temps healthy** — 35-41°C (idle range for these cards)
- **Power ~64W each** — typical idle draw for Quadro P6000
- **Script exists** at `/home/localadmin/scripts/node1-metrics-scraper.sh` and runs correctly

