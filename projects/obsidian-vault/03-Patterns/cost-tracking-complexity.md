---
date: 2026-05-06
tags: cost-tracking, gpu, monitoring, pattern
category: pattern
---

# Cost Tracking Complexity Pattern

## Pattern
- Multiple scraper iterations creating inconsistent log formats
- GPU power draw varies significantly between idle and load states
- VRAM usage doesn't correlate with compute utilization
- Temperature readings vary based on ambient conditions and workload

## Implications
- Cost tracking needs consistent measurement methodology
- Power draw is a better metric than compute utilization for cost estimation
- VRAM usage alone doesn't indicate active inference
- Temperature monitoring should be normalized to ambient conditions

## Related
- [[node2-gpu-idle-behavior]]
- [[cost-tracking-methodology]]
