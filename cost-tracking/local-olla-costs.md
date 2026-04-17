# OpenClaw Cost Tracking - Local Olla Model

**Tracking started:** 2026-04-05 20:01 UTC  
**Model:** `olla/llamacpp` (local GPU inference)  
**Electricity rate:** $0.16/kWh  
**Hardware:** RTX 4090 equivalent (350W)

## Cost Baseline
- **Cost per million tokens:** $0.53 (input + output)
- **Electricity cost:** $0.31/M tokens
- **Hardware depreciation:** $0.22/M tokens
- **Tokens per second:** ~50 tokens/sec
- **Energy per M tokens:** 1.946 kWh

## Daily Spend Log

### 2026-04-05
| Time (UTC) | Session | Tokens (M) | Cost | Notes |
|------------|---------|------------|------|-------|
| 20:01 | Session initialization | TBD | $0.00 | Tracking started |

## Tracking Method

**Manual entry required** - OpenClaw doesn't auto-track token usage yet.

**To record usage:**
1. Check token count in session history or logs
2. Calculate: `tokens / 1,000,000 × $0.53 = cost`
3. Add to daily log above
4. Update total spend

## Estimated Monthly Costs

| Usage (M tokens) | Cost | Cloud Equivalent (Claude Opus 4.6) | Savings |
|------------------|------|-----------------------------------|---------|
| 10 | $5.30 | $250 | $244.70 |
| 50 | $26.50 | $1,250 | $1,223.50 |
| 100 | $53.00 | $2,500 | $2,447.00 |
| 500 | $265.00 | $12,500 | $12,235.00 |

## Notes
- Costs are estimates based on local GPU inference
- Actual costs may vary based on model efficiency
- Hardware depreciation is 20% annually ($320/year for RTX 4090)
- Electricity cost based on $0.16/kWh rate

---
*Last updated: 2026-04-05 20:01 UTC*
