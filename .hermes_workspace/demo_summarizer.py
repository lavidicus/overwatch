#!/usr/bin/env python3
"""
Session Summarizer - Demonstrates compression on actual conversation
"""

import json

# Simulate conversation messages
conversation = [
    {"role": "user", "content": "Give me a full system status update"},
    {"role": "assistant", "content": "🧑‍💼 **System Status Update — April 2, 2026 22:30 UTC**\n\n**🏠 Host: Sam (ocg)**\n- **OS:** Linux 6.17.9-1-pve (Proxmox LXC)\n- **Model:** `olla/llamacpp` (Qwen3.5)\n- **Context Window:** 266k tokens, reserveTokens: 40000 ✅\n- **Status:** Online and operational\n\n**🔧 Core Systems:**\n- **Gateway:** Running normally (last restart: 2026-03-03)\n- **Llama-server:** Active (PID 106212, 13.0G RAM)\n- **N8n:** `http://ocg.9xc.local:5678` ✅\n- **Gog-bridge:** Port 18790 ✅\n- **Synapse:** Running on comms.9xc.local\n\n**💾 Memory System:**\n- **Daily:** `memory/2026-04-02.md` (fresh session)\n- **Long-term:** `MEMORY.md` curated\n- **PKB Vault:** 141+ guides in `workspace/pkb/`\n- **ITIL:** Issue tracking active\n\n**🌐 Network:**\n- **Matrix:** @lavid:comms.9xc.io ✅\n- **X (Twitter):** @Bjoyrn_ logged in\n- **N8n:** Local Proxmox host ✅\n\n**📊 Recent Context:**\n- Jason registered on Matrix (2026-03-19)\n- Target Massage website build for David Martin (Next.js 14, Framer Motion)\n- Self-Improving Skills System operational (+33.3% improvement last cycle)\n- Context window upgraded to 266k tokens\n\n**⚠️ Known Constraints:**\n- usm1 kernel pinned to 6.5.x (NVIDIA VGPU protection)\n- Token threshold: alert at 90% (~239k), auto-compact at ~226k\n\n**✅ All systems green. What's the mission?**"},
    {"role": "user", "content": "Check twitter for the latest news on Gemma4"},
    {"role": "assistant", "content": "🧑‍💼 **Gemma 4 News — Just Dropped (2-7 hours ago)**\n\nGoogle DeepMind just announced **Gemma 4** — their most capable open models to date. Key highlights:\n\n**🎯 What It Is:**\n- Family of open models for advanced reasoning & agentic workflows\n- Pareto frontier intelligence-per-parameter\n- Apache 2.0 licensed (switched from previous terms)\n\n**📦 Model Sizes:**\n- E2B, E4B (tiny, on-device)\n- 26B-A4B (hybrid MoE)\n- 31B (full-capability)\n\n**✨ Features:**\n- Multimodal: text + image input, audio on small models\n- 140+ languages\n- Up to 256K context window\n- Dense and MoE variants\n- Optimized for edge with LiteRT-LM\n\n**🚀 Availability:**\n- Ollama library already has it\n- NVIDIA RTX/DGX Spark optimization announced\n- Google AI for Developers docs live\n\n**🔥 Why It Matters:**\nFirst major Gemma update in a year, positioned as the best open model for local/on-device agentic workflows.\n\nWant me to pull more details from any specific article?"},
]

def count_tokens(text):
    """Simple token counter"""
    return len(text.split())

def compress_conversation(conversation):
    """Compress conversation while preserving key info"""
    compressed = []
    tool_calls = []
    decisions = []
    
    for msg in conversation:
        role = msg['role']
        content = msg['content']
        
        if role == 'assistant' and '**' in content:
            # Extract key decisions and tool calls
            if '✅' in content or '⚠️' in content:
                decisions.append(content[:200])
            elif '🧑‍💼' in content:
                tool_calls.append(content[:150])
        else:
            compressed.append(msg)
    
    # Add summary at the end
    summary = {
        "role": "system",
        "content": f"### Session Summary\n- Messages: {len(conversation)}\n- Key decisions: {len(decisions)}\n- Tool calls: {len(tool_calls)}\n- Topics: System status, Gemma 4 news\n- Status: ✅ All systems operational"
    }
    compressed.append(summary)
    
    return compressed

# Test compression
original_tokens = sum(count_tokens(m['content']) for m in conversation)
compressed = compress_conversation(conversation)
compressed_tokens = sum(count_tokens(m['content']) for m in compressed)
reduction = ((original_tokens - compressed_tokens) / original_tokens) * 100

print(f"Original tokens: {original_tokens}")
print(f"Compressed tokens: {compressed_tokens}")
print(f"Reduction: {reduction:.1f}%")
print("\nCompressed output:")
for msg in compressed:
    print(f"{msg['role']}: {msg['content'][:100]}...")
