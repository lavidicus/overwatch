# LLM Selector Skill

Interactive model selector for node2's llama-server.service. Choose from available GGUF models and update the service configuration.

## Usage

```bash
# From command line (interactive)
llm-selector

# Or via chat
"Select a model for llama-server"
```

## Location

- **Script:** `/home/localadmin/llm_selector.sh` on node2
- **Model directory:** `/opt/models/gguf/`
- **Symlink:** `llamacpp.gguf`
- **Service:** `/etc/systemd/system/llama-server.service`

## How It Works

1. Lists all `.gguf` files in `/opt/models/gguf/` (excluding the symlink)
2. Prompts for selection
3. Updates the symlink to point to the chosen model
4. Updates `llama-server.service` ExecStart line:
   - Replaces model path after `-m`
   - Adds `--mmproj` flag if vision model selected (using `/opt/models/gguf/mmproj-F16.gguf`)
   - Preserves all existing flags (`--ctx-size`, `--host`, `--port`)
   - **Adds trailing backslash** for line continuation
5. Reloads systemd and restarts the service
6. Shows final service status

## Features

- **Backslash guard:** Ensures ExecStart line ends with ` \` for systemd line continuation
- **Backup:** Creates `.bak` backup before editing service file
- **Vision support:** Optional `--mmproj` flag for multimodal models
- **Flag preservation:** Updates `--ctx-size`, `--host`, `--port` while keeping other flags intact

## Dependencies

- `sudo` access on node2
- `/opt/models/gguf/` directory with `.gguf` files
- `/opt/models/gguf/mmproj-F16.gguf` (optional, for vision models)
- `llama-server.service` systemd unit

## Example Flow

```
GGUF files in /opt/models/gguf:
 1) Qwen3.5-35B-A3B-Q4_K_M.gguf
 2) Llama-3.1-8B-Instruct-Q4_K_M.gguf

Select a file number to link as llamacpp.gguf: 1

Does this model support vision (add --mmproj /opt/models/gguf/mmproj-F16.gguf to ExecStart)? [y/N]: n

Current service file:
10 ExecStart=/opt/llama.cpp/build/bin/llama-server -m /opt/models/gguf/old.gguf --ctx-size 8192 --host 0.0.0.0 --port 11434

Update service file with new model link? [y/N]: y

New ExecStart will be:
/opt/llama.cpp/build/bin/llama-server -m /opt/models/gguf/llamacpp.gguf --ctx-size 262144 --host 0.0.0.0 --port 11434 \

Updated ExecStart to:
10 ExecStart=/opt/llama.cpp/build/bin/llama-server -m /opt/models/gguf/llamacpp.gguf --ctx-size 262144 --host 0.0.0.0 --port 11434 \

Reloading systemd and restarting llama-server.service (requires sudo):
● llama-server.service - llama.cpp server
     Active: active (running) since Thu 2026-04-16 04:45:00 UTC
```

## Background Execution

When invoked via chat, this skill runs as a background job to keep the assistant responsive during service reload:

```bash
ssh localadmin@node2 '/home/localadmin/llm_selector.sh' &
```

Announces completion (or error) to Matrix chat when finished.
