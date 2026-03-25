#!/bin/bash
# Configure llama-server for LTX-2.3 on Olla host
# This will let us switch between Qwen3.5 and LTX-2.3

set -e

OLLAM_HOST="172.16.254.100"

echo "🔧 Configuring llama-server for dual models..."

# Create a wrapper script for easy model switching
cat > /home/localadmin/.openclaw/workspace/switch-model.sh << 'EOF'
#!/bin/bash
# Switch between Qwen3.5 and LTX-2.3 on Olla host

MODEL=$1
PORT=${2:-11434}

case $MODEL in
    qwen)
        echo "🔄 Switching to Qwen3.5 (text+vision)..."
        curl -s http://localhost:$PORT/v1/completions \
          -H "Content-Type: application/json" \
          -d '{"model":"qwen3.5:latest","prompt":"ready","max_tokens":1}' \
          > /dev/null
        echo "✅ Using Qwen3.5"
        ;;
    ltx)
        echo "🔄 Switching to LTX-2.3 (image/video gen)..."
        curl -s http://localhost:$PORT/v1/completions \
          -H "Content-Type: application/json" \
          -d '{"model":"ltx-2.3-22b-dev-Q4_K_M","prompt":"ready","max_tokens":1}' \
          > /dev/null
        echo "✅ Using LTX-2.3"
        ;;
    *)
        echo "Usage: switch-model.sh [qwen|ltx] [port]"
        ;;
esac
EOF

chmod +x /home/localadmin/.openclaw/workspace/switch-model.sh

echo "✅ Model switcher ready: switch-model.sh"
echo ""
echo "To use:"
echo "  ./switch-model.sh qwen 11434  # Text & vision"
echo "  ./switch-model.sh ltx 11435    # Image/Video generation"
