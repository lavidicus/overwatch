# Node2 GPU Metrics — 2026-04-21 20:28 UTC

**Scraper script:** `/home/localadmin/scripts/node1-metrics-scraper.sh` — does NOT exist on node2. Using inline nvidia-smi.

## GPU Inventory

| GPU | Model | Driver | CUDA |
|-----|-------|--------|------|
| 0 | Quadro P6000 (Pascal) | 580.126.20 | 13.0 |

**Attached GPUs:** 1 (second Quadro P6000 not detected — may be in the other slot without a card or PCIe link down)

## GPU 0 — Quadro P6000 (PCIe 3.0 x16)

| Metric | Value |
|--------|-------|
| Temperature | 53°C (target: 83°C, shutdown: 100°C) |
| Power Draw | 65.82 W (limit: 250 W) |
| GPU Utilization | 0% |
| Memory Utilization | 0% |
| VRAM Total | 24,576 MiB |
| VRAM Used | 23,653 MiB (96.2%) |
| VRAM Free | 785 MiB |
| BAR1 Used | 5 MiB / 256 MiB |
| Persistence Mode | Enabled |
| Virtualization | Pass-Through |
| PCIe Link | Gen3 x16 (max Gen3 x16) |

## Running Processes

| PID | Type | Name | VRAM |
|-----|------|------|------|
| 9822 | C (compute) | /opt/llama.cpp/build/bin/llama-server | 23,648 MiB |

## Notes

- llama-server is idle (0% util) but holding ~23.6 GB of VRAM (model loaded)
- Only 1 GPU detected — the second Quadro P6000 slot is empty or not reporting
- Power draw is low (65W) consistent with idle state
- Temperature is cool at 53°C
