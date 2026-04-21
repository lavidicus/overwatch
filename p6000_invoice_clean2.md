# Ollama Model Cost Invoice – April 9, 2026 (2 P6000 GPUs)

Model: llama/llamacpp (running on 2 NVIDIA P6000 GPUs @ 250 W each, total 500 W)

Assumptions:
- Power draw: 500 W (0.5 kW) sustained inference
- Electricity rate: $0.10 per kWh (US residential average)
- Hours of operation today: 6 h (estimate)
- Tokens processed today: 1,068,832 tokens (0.8 M input + 0.067 M output – same as the 3090 example for a fair comparison)
- Acquisition cost of each P6000: $1500 (total $3000)
- Depreciation: 20 % annually -> $600 / yr ~ $1.64 / day

Cost Breakdown (local hardware):

Component          Rate            Usage                Amount        Cost
Input tokens       $0.04 / M tokens  1,002,126           1.002126 M    $0.0401
Output tokens      $0.15 / M tokens  66,706              0.066706 M    $0.0100
Token cost (local)                     |                                 $0.0501
Electricity (0.5 kW x 6 h x $0.10/kWh)                     $0.30
Depreciation ( $600 / yr ÷ 365 days × 6 h )               $0.13
Total local cost                                     $0.48

Cloud-equivalent (Claude Opus 4.6) for comparison:
- Input: $15.00 / M x 1.002 M = $15.03
- Output: $75.00 / M x 0.067 M = $5.00
Total cloud cost: $20.03
Savings vs. cloud: $19.55 (~ 97 %)

Infrastructure details
- Hardware: 2 x NVIDIA P6000, 24 GB VRAM each
- Power draw: ~250 W per GPU, 500 W total
- Electricity rate: $0.10/kWh (Louisiana residential – same as example)
- Software stack: llama.cpp (llama-server) with Qwen 3.5 35B GGUF model
- Metrics scraped via Prometheus at 12:00 UTC; daily baseline reset

Generated automatically by Sam, your ops-butler.