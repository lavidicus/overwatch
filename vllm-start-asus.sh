#!/bin/bash
source ~/vllm-env/bin/activate

# vLLM startup script for asus (4x RTX PRO 6000 Blackwell)
# Usage: ./start-vllm.sh [model] [port]

MODEL=${1:-Qwen/Qwen3-35B-A3B}
PORT=${2:-8000}

echo "Starting vLLM with model: $MODEL on port $PORT"
echo "GPUs: 4x NVIDIA RTX PRO 6000 Blackwell (97GB each)"

python -m vllm.entrypoints.openai.api_server \
    --model "$MODEL" \
    --port $PORT \
    --host 0.0.0.0 \
    --tensor-parallel-size 4 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 32768 \
    --trust-remote-code
