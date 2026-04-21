# Ollama Model Cost Invoice – April 9, 2026

**Customer:** Jeremy Ingalls
**Provider:** Sam – Operations Butler
**Date:** April 9, 2026

---

## Usage Summary

- Model: llama/llamacpp (Qwen 3.5 35B GGUF)
- Hardware: 2 x NVIDIA P6000 GPUs, 250 W each (total 500 W)
- Tokens processed: 1,068,832 (1,002,126 input, 66,706 output)

## Cost Breakdown

| Component               | Rate                | Amount | Cost |
|-------------------------|---------------------|--------|------|
| Input tokens            | $0.04 per M tokens  | 1,002,126 | $0.0401 |
| Output tokens           | $0.15 per M tokens  | 66,706   | $0.0100 |
| **Token cost (local)**  |                     |          | $0.0501 |
| Electricity (0.5 kW x 6 h x $0.16/kWh) | | | $0.48 |
| Depreciation (20% yr on $3,000 hardware) | | | $0.13 |
| **Total local cost**    |                     |          | **$0.66** |

## Cloud Equivalent (Claude Opus 4.6)

- Input tokens: $15.00 per M -> $15.03
- Output tokens: $75.00 per M -> $5.00
- **Total cloud cost:** $20.03
- **Savings:** $19.37 (~ 97%)

## Infrastructure Details

- Acquisition cost: $3,000
- Depreciation: $1.64 per day, $0.13 for today’s 6‑hour window
- Electricity rate: $0.16 per kWh (Louisiana residential)
- Monitoring: Prometheus, daily reset at 12:00 UTC

**Amount Due:** $0.66 USD

---

*This statement is generated automatically on demand. All figures are based on measured benchmarks from production runs.*
