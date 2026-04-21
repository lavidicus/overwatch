# Ollama Model Cost Invoice – April 9, 2026

**Model:** llama/llamacpp (running on 2 P6000 GPUs @ 250 W each, total 500 W)

**Assumptions:**
- Power draw: 500 W (0.5 kW)
- Electricity rate: $0.10 per kWh (typical US rate)
- Hours of operation today: 6 h (estimate)
- Tokens processed today: 800,000 tokens (0.8 M tokens)

**Cost Breakdown (from openclaw.json):**
- Electricity cost per M tokens: $0.31
- Hardware cost per M tokens: $0.22
- Total cost per M tokens: $0.53

**Invoice Calculation:**
- Tokens used: 0.8 M → 0.8 × $0.31 = $0.248 (electricity)
- Tokens used: 0.8 M → 0.8 × $0.22 = $0.176 (hardware)
- **Token cost total:** $0.424
- **Power‑related electricity (additional):** 0.5 kW × 6 h × $0.10/kWh = $0.30 (included in token cost estimate)

**Grand Total:** $0.424 (rounded to $0.43)

*Generated automatically by Sam, your ops‑butler.*