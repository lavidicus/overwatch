#!/usr/bin/env bash
set -euo pipefail

DIR="/opt/models/gguf"
LINK_NAME="qwen3.5:latest.gguf"
LINK_PATH="${DIR}/${LINK_NAME}"

SERVICE_FILE="/etc/systemd/system/llama-server.service"
SERVICE_NAME="llama-server.service"

LLAMA_BIN="/opt/llama.cpp/build/bin/llama-server"
MM_PROJ="${DIR}/mmproj-F16.gguf"

HOST="0.0.0.0"
PORT="11434"
CTX="262144"

need_root() {
 if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
 echo "This script uses sudo for system changes. You may be prompted for your password."
 fi
}

prompt_yn() {
 local prompt="$1"
 local ans
 while true; do
 read -r -p "$prompt [y/N]: " ans || true
 ans="${ans:-N}"
 case "${ans,,}" in
 y|yes) return 0 ;;
 n|no) return 1 ;;
 *) echo "Please answer y/yes or n/no." ;;
 esac
 done
}

need_root

# Collect .gguf files (excluding the link name itself if it exists)
mapfile -t files < <(
 find "$DIR" -maxdepth 1 -type f -name '*.gguf' -printf '%f\n' \
 | sort \
 | grep -v -F "$LINK_NAME" \
 || true
)

if (( ${#files[@]} == 0 )); then
 echo "No .gguf files found in: $DIR"
 exit 1
fi

echo "GGUF files in $DIR:"
for i in "${!files[@]}"; do
 printf " %d) %s\n" "$((i+1))" "${files[$i]}"
done

echo
read -r -p "Select a file number to link as ${LINK_NAME}: " choice

if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
 echo "Invalid input: must be a number."
 exit 1
fi
if (( choice < 1 || choice > ${#files[@]} )); then
 echo "Invalid selection: choose 1-${#files[@]}."
 exit 1
fi

target="${DIR}/${files[$((choice-1))]}"

# Create/replace symlink with sudo
echo
echo "Updating symlink (requires sudo):"
sudo rm -f "$LINK_PATH"
sudo ln -s "$target" "$LINK_PATH"
sudo ls -l "$LINK_PATH"

# Ask about vision / mmproj
echo
use_vision=false
if prompt_yn "Does this model support vision (add --mmproj ${MM_PROJ} to ExecStart)?"; then
 use_vision=true
 if [[ ! -f "$MM_PROJ" ]]; then
 echo "WARNING: ${MM_PROJ} not found. ExecStart will still be updated to include it."
 fi
fi

echo
echo "Current service file:"
grep -n 'ExecStart' "$SERVICE_FILE" || true

echo
if prompt_yn "Update service file with new model link?"; then
 # Read current ExecStart line and preserve all flags after the model path
 current_line=$(grep -n '^[[:space:]]*ExecStart=' "$SERVICE_FILE" | head -1)
 model_path="${LINK_PATH}"
 
 # Extract everything after the model path in the original ExecStart
 # This preserves all flags like -np 4 -fa on -b 128 etc.
 base_path="/opt/models/gguf/qwen3.5:latest.gguf"
 
 if $use_vision; then
   # Replace model path, keep vision flag and all other flags
   sudo sed -i "s|ExecStart=${LLAMA_BIN} ${base_path}|ExecStart=${LLAMA_BIN} ${model_path} --mmproj ${MM_PROJ}|" "$SERVICE_FILE"
   sudo sed -i "s|ExecStart=${LLAMA_BIN} ${model_path} --mmproj ${MM_PROJ}|ExecStart=${LLAMA_BIN} ${model_path} --mmproj ${MM_PROJ}|" "$SERVICE_FILE"
 else
   # Replace model path, keep all other flags (context-shift, -np, -fa, -b, -ub, --cache-type-k, --cache-type-v, etc.)
   sudo sed -i "s|ExecStart=${LLAMA_BIN} ${base_path}|ExecStart=${LLAMA_BIN} ${model_path}|" "$SERVICE_FILE"
   sudo sed -i "s|ExecStart=${LLAMA_BIN} ${model_path}|ExecStart=${LLAMA_BIN} ${model_path}|" "$SERVICE_FILE"
 fi

 # Also update ctx-size if it's there
 if grep -q 'ctx-size' "$SERVICE_FILE"; then
   sudo sed -i "s/--ctx-size [0-9]*/--ctx-size ${CTX}/" "$SERVICE_FILE"
 fi

 # Update host and port if needed
 sudo sed -i "s/--host [0-9.]*/--host ${HOST}/" "$SERVICE_FILE"
 sudo sed -i "s/--port [0-9]*/--port ${PORT}/" "$SERVICE_FILE"

 echo "Updated ExecStart to:"
 grep -n '^[[:space:]]*ExecStart=' "$SERVICE_FILE" || true

 echo
 echo "Reloading systemd and restarting ${SERVICE_NAME} (requires sudo):"
 sudo systemctl daemon-reload
 sudo systemctl restart "$SERVICE_NAME"
 sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
 echo "Aborted."
fi
