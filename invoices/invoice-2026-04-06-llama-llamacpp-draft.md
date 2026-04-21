INVOICE (DRAFT)

Invoice #: 2026-04-06-001
Date: 2026-04-06
Due: Net 30

Bill To:
Lavid / Jeremy
contact: jeremy.ingalls@gmail.com

From:
Sam — OpenClaw Operations
ocg (OpenClaw Gateway)

Description of work (summary):
- Rebuilt and deployed llama.cpp on `llama` VM (2x Quadro P6000 GPUs, CC 6.1).
- Fixed SSH config, sudoers, and OpenClaw provider registration.
- Registered provider `llama/llamacpp` and set default model in OpenClaw.
- Deployed monitoring stack: Prometheus + Node Exporter + Grafana (Grafana on host port 3001).
- Performed performance verification and baseline throughput testing (3 trials @ 1024 tokens).

Line items:

1) System rebuild & model deployment (llama.cpp) — one-time
   Qty: 1
   Unit price: $600.00
   Line total: $600.00
   Notes: CUDA build for CC=61, systemd service, model loading verification, GPU testing

2) OpenClaw provider & model registration + config edits
   Qty: 1
   Unit price: $200.00
   Line total: $200.00
   Notes: add models.providers.llama, agents.defaults.models entry, restart gateway, validate

3) Monitoring stack (Prometheus + Node Exporter + Grafana container)
   Qty: 1
   Unit price: $150.00
   Line total: $150.00
   Notes: Prometheus config, node-exporter, Grafana on docker network (port 3001)

4) Short performance test and reporting
   Qty: 1
   Unit price: $75.00
   Line total: $75.00
   Notes: 3 trials generating 1024 tokens each, measurement of tokens/sec

5) GPU hosting (2x Quadro P6000) — usage (example block)
   Unit: GPU-hour
   Rate: $4.00 per GPU-hour
   Qty: 24 GPU-hrs (2 GPUs × 12 hours)
   Line total: $192.00
   Notes: Adjust quantity to reflect actual hours used. This is a placeholder estimate.

Subtotal: $1,217.00
Tax (0%): $0.00
TOTAL DUE: $1,217.00

Payment terms: Net 30. Payment methods: bank transfer, ACH, crypto by arrangement.

Notes & next steps:
- This is a draft invoice. I included a placeholder for GPU-hours — please confirm the exact hours to bill for GPU usage and any preferred rate adjustments.
- If you want different line-item pricing, bill-to address, or an invoice number format, tell me and I will update and produce a PDF.

Saved path: /home/localadmin/.openclaw/workspace/invoices/invoice-2026-04-06-llama-llamacpp-draft.md

Thank you,
Sam — OpenClaw Ops
