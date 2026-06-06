#!/usr/bin/env bash
set -euo pipefail

DIR="/opt/models/gguf"
LINK_NAME="llamacpp.gguf"
LINK_PATH="${DIR}/${LINK_NAME}"
MMPROJ_LINK_NAME="mmproj.gguf"
MMPROJ_LINK_PATH="${DIR}/${MMPROJ_LINK_NAME}"

SERVICE_FILE="/etc/systemd/system/llama-server.service"
SERVICE_NAME="llama-server.service"

HOST="0.0.0.0"
PORT="11434"
CTX="65536"

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

detect_quant() {
  local filename="$1"
  if [[ "$filename" =~ [Qq]8 ]]; then
    echo "q8_0"
  elif [[ "$filename" =~ [Qq]4 ]]; then
    echo "q4_0"
  else
    echo ""
  fi
}

need_root

# ── Step 1: Select the main GGUF model (search recursively) ──
echo "Scanning for .gguf model files in $DIR (including subfolders)..."
mapfile -t files < <(
  find "$DIR" -type f -name '*.gguf' \
    ! -path "$LINK_PATH" \
    ! -path "$MMPROJ_LINK_PATH" \
    ! -iname '*mmproj*' \
    -printf '%P\n' | sort
)

if (( ${#files[@]} == 0 )); then
  echo "No .gguf model files found in: $DIR"
  exit 1
fi

echo
echo "Available GGUF models:"
for i in "${!files[@]}"; do
  printf "  %d) %s\n" "$((i+1))" "${files[$i]}"
done

echo
read -r -p "Select a model number to link as ${LINK_NAME}: " choice

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#files[@]} )); then
  echo "Invalid selection."
  exit 1
fi

selected_model="${files[$((choice-1))]}"
target="${DIR}/${selected_model}"

echo
echo "Selected model: $selected_model"

# ── Step 2: Update model symlink ──
echo
echo "Updating model symlink (requires sudo):"
sudo rm -f "$LINK_PATH"
sudo ln -s "$target" "$LINK_PATH"
sudo ls -l "$LINK_PATH"

# ── Step 3: Detect quant for cache-type ──
quant="$(detect_quant "$selected_model")"
if [[ -z "$quant" ]]; then
  echo
  echo "Could not auto-detect quant from filename."
  echo "  1) q4_0"
  echo "  2) q8_0"
  read -r -p "Select cache quant type [1/2]: " qchoice
  case "$qchoice" in
    1) quant="q4_0" ;;
    2) quant="q8_0" ;;
    *) echo "Invalid, defaulting to q4_0"; quant="q4_0" ;;
  esac
fi
echo "Cache type will be set to: $quant"

# ── Step 4: Vision / mmproj selection ──
use_vision=false

if prompt_yn "Does this model support vision (select an mmproj file)?"; then
  use_vision=true

  # Find mmproj files recursively — exclude only the root-level symlink by path, not by name
  mapfile -t mmprojs < <(
    find "$DIR" -type f -iname '*mmproj*' -name '*.gguf' \
      ! -path "$MMPROJ_LINK_PATH" \
      -printf '%P\n' | sort
  )

  if (( ${#mmprojs[@]} == 0 )); then
    echo "WARNING: No mmproj files found in $DIR or subfolders."
    use_vision=false
  elif (( ${#mmprojs[@]} == 1 )); then
    selected_mmproj="${mmprojs[0]}"
    echo "Found one mmproj: ${selected_mmproj}"
  else
    echo
    echo "Available mmproj files:"
    for i in "${!mmprojs[@]}"; do
      printf "  %d) %s\n" "$((i+1))" "${mmprojs[$i]}"
    done
    echo
    read -r -p "Select mmproj number: " mchoice
    if ! [[ "$mchoice" =~ ^[0-9]+$ ]] || (( mchoice < 1 || mchoice > ${#mmprojs[@]} )); then
      echo "Invalid selection, skipping vision."
      use_vision=false
    else
      selected_mmproj="${mmprojs[$((mchoice-1))]}"
    fi
  fi

  if $use_vision; then
    mmproj_target="${DIR}/${selected_mmproj}"
    echo
    echo "Updating mmproj symlink (requires sudo):"
    sudo rm -f "$MMPROJ_LINK_PATH"
    sudo ln -s "$mmproj_target" "$MMPROJ_LINK_PATH"
    sudo ls -l "$MMPROJ_LINK_PATH"
  fi
fi

# ── Step 5: Update service file (PRESERVE existing flags) ──
echo
echo "Current ExecStart:"
grep -n 'ExecStart=' "$SERVICE_FILE" || true

echo
if prompt_yn "Update service file and restart llama-server?"; then
  sudo cp "$SERVICE_FILE" "${SERVICE_FILE}.bak"

  # Read the existing service file and extract current flags
  # We preserve ALL existing flags and only update:
  #   - model path (--model / -m)
  #   - mmproj path (if vision changed)
  #   - ctx-size (if explicitly changed)
  #   - cache-type-k/v (if quant changed)

  # Read the full ExecStart block (may span multiple lines with \)
  exec_start=""
  in_exec=false
  while IFS= read -r line; do
    if [[ "$line" =~ ^ExecStart= ]]; then
      in_exec=true
      exec_start="${line#ExecStart=}"
    elif $in_exec && [[ "$line" =~ ^[[:space:]] ]]; then
      exec_start="${exec_start} ${line}"
    elif $in_exec; then
      in_exec=false
    fi
  done < "$SERVICE_FILE"

  # Remove the leading binary path from exec_start for parsing
  binary_path="/opt/llama.cpp/build/bin/llama-server"
  args="${exec_start#$binary_path}"

  # Parse existing flags into an associative array
  declare -A existing_flags
  current_key=""
  while [[ -n "$args" ]]; do
    # Skip leading whitespace
    args="${args#"${args%%[![:space:]]*}"}"
    if [[ -z "$args" ]]; then break; fi

    if [[ "$args" =~ ^(--[a-zA-Z0-9_-]+) ]]; then
      current_key="${BASH_REMATCH[1]}"
      # Check if next token is a value (not another flag)
      rest="${args#"$current_key"}"
      rest="${rest#"${rest%%[![:space:]]*}"}"
      if [[ -n "$rest" && ! "$rest" =~ ^- ]]; then
        existing_flags["$current_key"]="$rest"
        args="$rest"
      else
        existing_flags["$current_key"]=""
      fi
      args="${rest#"${rest%%[![:space:]]*}"}"
    elif [[ "$args" =~ ^(-[a-zA-Z]) ]]; then
      current_key="${BASH_REMATCH[1]}"
      rest="${args#"$current_key"}"
      rest="${rest#"${rest%%[![:space:]]*}"}"
      if [[ -n "$rest" && ! "$rest" =~ ^- ]]; then
        existing_flags["$current_key"]="$rest"
        args="$rest"
      else
        existing_flags["$current_key"]=""
      fi
      args="${rest#"${rest%%[![:space:]]*}"}"
    elif [[ "$args" =~ ^\" ]]; then
      # Quoted value
      args="${args#\"}"
      args="${args#\"}"
    else
      # Bare value (e.g. model path)
      args="${args#"${args%%[![:space:]]*}"}"
      if [[ -n "$args" && ! "$args" =~ ^- ]]; then
        if [[ -z "$current_key" ]]; then
          existing_flags["_model_path"]="$args"
        fi
        args="${args#"${args%%[![:space:]]*}"}"
      else
        break
      fi
    fi
  done

  # Build new ExecStart from existing flags, updating only what changed
  new_exec="$binary_path"

  # Update model path (always changes when we select a new model)
  new_exec="${new_exec} -m ${LINK_PATH}"

  # Update mmproj if vision changed
  if $use_vision; then
    new_exec="${new_exec} --mmproj ${MMPROJ_LINK_PATH}"
  fi

  # Copy all other existing flags that we didn't explicitly change
  for key in "${!existing_flags[@]}"; do
    # Skip flags we already handled
    [[ "$key" == "-m" || "$key" == "--model" || "$key" == "--mmproj" ]] && continue

    # Skip ctx-size if we want to keep existing (don't auto-update it)
    [[ "$key" == "--ctx-size" ]] && continue

    # Skip cache-type if we want to keep existing
    [[ "$key" == "--cache-type-k" || "$key" == "--cache-type-v" ]] && continue

    if [[ -n "${existing_flags[$key]}" ]]; then
      new_exec="${new_exec} ${key} ${existing_flags[$key]}"
    else
      new_exec="${new_exec} ${key}"
    fi
  done

  tmpfile="$(mktemp)"
  cat > "$tmpfile" << INNEREOF
# /etc/systemd/system/llama-server.service
[Unit]
Description=llama.cpp Server (CUDA - P6000)
After=network.target

[Service]
Type=simple
User=llamacpp
Group=llamacpp
Environment=PATH=/usr/local/cuda-12.9/bin:/usr/bin:/bin
Environment=LD_LIBRARY_PATH=/usr/local/cuda-12.9/lib64
ExecStart=${new_exec}
Restart=on-failure
RestartSec=10
WorkingDirectory=/opt/llama.cpp

[Install]
WantedBy=multi-user.target
INNEREOF

  sudo cp "$tmpfile" "$SERVICE_FILE"
  rm -f "$tmpfile"

  echo
  echo "Updated service file:"
  cat "$SERVICE_FILE"

  echo
  echo "Reloading systemd and restarting ${SERVICE_NAME}..."
  sudo systemctl daemon-reload
  sudo systemctl restart "$SERVICE_NAME"
  sleep 2
  sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
  echo "Aborted."
fi
