# HugPull Skill

Download GGUF models from URLs to node2's model directory.

## Usage

```bash
# From command line
hugpull <URL-to-GGUF>

# Or via chat
"Download Qwen3.5-35B-A3B-Q4_K_M.gguf from https://huggingface.co/..."
```

## Location

- **Script:** `/home/localadmin/hugpull.sh` on node2
- **Target directory:** `/opt/models/gguf/`
- **Tool command:** `hugpull` (bash script executed on node2 via SSH)

## How It Works

1. Takes a single URL argument pointing to a GGUF file
2. Extracts filename from URL
3. Uses wget (preferred) or curl to download
4. Saves to `/opt/models/gguf/` on node2
5. Confirms completion

## Example

```bash
hugpull "https://huggingface.co/bartowski/Qwen3.5-35B-A3B-Q4_K_M.gguf/resolve/main/Qwen3.5-35B-A3B-Q4_K_M.gguf"
```

## Dependencies

- `wget` or `curl` on node2
- `ssh` access to node2 as `localadmin`
- `/opt/models/gguf/` directory exists on node2
