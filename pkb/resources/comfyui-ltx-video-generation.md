# ComfyUI + LTX-2.3 Video Generation

**Category:** AI/ML — Diffusion Models
**Host:** llama (172.16.254.199)
**Service:** sd-server.service
**Port:** 8188
**Installed:** 2026-04-07

## Overview

ComfyUI is a node-based diffusion model UI with a powerful HTTP API. Our instance runs LTX-2.3 (22B parameter DiT model by Lightricks) for text-to-video and image-to-video generation with synchronized audio.

## Architecture

```
ocg (gateway) --ssh--> llama (GPU server)
                         |
                         ├── sd-server.service (ComfyUI on port 8188)
                         │     ├── 2× Quadro P6000 (48GB VRAM)
                         │     ├── PyTorch 2.5.1+cu121
                         │     └── Python 3.12 venv
                         │
                         └── llama-server.service (LLM on port 11434)
                               └── CONFLICTS: shares same GPUs
```

## Model Stack

| Component | File | Size |
|-----------|------|------|
| Diffusion backbone | ltx-2.3-22b-dev-Q4_K_M.gguf | 14GB |
| Video VAE | ltx-2.3-22b-dev_video_vae.safetensors | ~200MB |
| Audio VAE | ltx-2.3-22b-dev_audio_vae.safetensors | ~200MB |
| Text encoder (Gemma 3 12B) | gemma-3-12b-it-qat-UD-Q4_K_XL.gguf | ~7GB |
| Embeddings connector | ltx-2.3-22b-dev_embeddings_connectors.safetensors | ~50MB |

## Key Decisions

- **ComfyUI over stable-diffusion.cpp**: sd.cpp doesn't support LTX-Video yet (open feature request #1189)
- **GGUF quantized model**: Q4_K_M chosen to fit in 48GB VRAM with room for VAE + text encoder
- **Gemma 3 12B as text encoder**: Recommended by Unsloth for LTX-2.3 GGUF workflows
- **Venv isolation**: PyTorch installed in `/home/localadmin/ComfyUI/venv/` to avoid system conflicts
- **Symlinks to HF cache**: Models stored in `~/.cache/huggingface/` with symlinks in ComfyUI dirs

## GPU Sharing Conflict

`llama-server` (LLM) and `sd-server` (ComfyUI) both use the same 2× P6000 GPUs. Only one should run at a time:

```bash
# Switch to image/video gen
ssh localadmin@llama "sudo systemctl stop llama-server && sudo systemctl start sd-server"

# Switch back to LLM
ssh localadmin@llama "sudo systemctl stop sd-server && sudo systemctl start llama-server"
```

Both services are `enabled` — on reboot both will attempt to start. Consider disabling one.

## Related

- **Skill:** `~/.openclaw/workspace/skills/comfyui/SKILL.md`
- **Playbook:** `ITIL/playbooks/comfyui-ltx-setup.md`
- **LTX-2.3 docs:** https://huggingface.co/Lightricks/LTX-2.3
- **ComfyUI-GGUF:** https://github.com/city96/ComfyUI-GGUF
- **Unsloth GGUF:** https://huggingface.co/unsloth/LTX-2.3-GGUF
