# Node2 GPU Metrics Documentation

**Date:** 2026-05-08
**Source:** memory/ files, daily monitoring
**Tags:** #node2 #gpu #monitoring #quadro-p6000

## Infrastructure
- **Host:** node2
- **GPUs:** 2x Quadro P6000 (24GB VRAM each)
- **Driver:** 580.126.20, CUDA 13.0
- **Monitoring:** Script at `/home/localadmin/scripts/node1-metrics-scraper.sh`
- **Log location:** `/home/localadmin/logs/node2-gpu-metrics.log`
- **Interval:** Every 5 minutes via cron

## Typical Readings (Idle State)
- **GPU 0:** 50-60°C, 65-70W, 0% util, 21.6/24 GB VRAM
- **GPU 1:** 45-55°C, 64-67W, 0% util, 22.8/24 GB VRAM
- **VRAM Usage:** ~88% occupied (llama.cpp model weights)
- **Power Draw:** ~130-140W combined
- **Status:** Healthy, stable idle

## Active Workload Readings
- **GPU 0:** 56-72°C, 100-197W, 10-100% util, 21.6/24 GB VRAM
- **GPU 1:** 49-66°C, 65-115W, 2-54% util, 22.8/24 GB VRAM
- **Status:** Active inference/training, temps within safe range

## Key Observations
1. **High VRAM usage is normal** - llama.cpp pre-allocates model weights (~22GB per GPU)
2. **Temperatures are healthy** - 50-72°C range, well within safe limits
3. **Power draw correlates with utilization** - 65W idle vs 197W active
4. **Monitoring script is reliable** - consistent logging every 5 minutes
5. **No anomalies detected** - stable performance over extended periods

## Alert Thresholds
- **Temperature warning:** >75°C sustained
- **Power warning:** >220W sustained
- **Utilization anomaly:** Unexpected high utilization when idle
- **VRAM leak:** Gradual VRAM increase without workload

## Related Files
- `memory/2026-05-01.md` - Daily GPU metrics
- `memory/2026-05-02.md` - Daily GPU metrics
- `memory/2026-05-03.md` - Daily GPU metrics
- `ITIL/playbooks/` - Related operational procedures

---
*Created: 2026-05-08 | Last updated: 2026-05-08*