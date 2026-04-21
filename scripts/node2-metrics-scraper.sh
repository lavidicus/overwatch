#!/bin/bash
# Node1/Node2 GPU Metrics Scraper
# Collects GPU metrics using python3 NVML (with /sys fallback for driver mismatches)

set -e

OUTPUT_DIR="/home/localadmin/node1-metrics"
mkdir -p "${OUTPUT_DIR}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="${OUTPUT_DIR}/node1-gpu-${TIMESTAMP}.json"
export OUTPUT_FILE

python3 << 'PYEOF'
import json
import datetime
import ctypes
import subprocess
import os
import sys

result = {
    "timestamp": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "gpus": [],
    "system_load": "",
    "note": ""
}

# --- Try NVML first ---
nvml_ok = False
try:
    nvml = ctypes.cdll.LoadLibrary("libnvidia-ml.so")
    nvml.nvmlInit()

    devCount = ctypes.c_int()
    nvml.nvmlDeviceGetCount(ctypes.byref(devCount))

    if devCount.value > 0:
        for i in range(devCount.value):
            handle = ctypes.c_void_p()
            nvml.nvmlDeviceGetHandleByIndex(i, ctypes.byref(handle))

            name = ctypes.create_string_buffer(256)
            nvml.nvmlDeviceGetName(handle, name, 256)

            temp = ctypes.c_int()
            nvml.nvmlDeviceGetTemperature(handle, 0, ctypes.byref(temp))

            pwr = ctypes.c_uint()
            nvml.nvmlDeviceGetPowerUsage(handle, ctypes.byref(pwr))

            util = ctypes.c_uint()
            nvml.nvmlDeviceGetUtilizationRates(handle, ctypes.byref(util))

            gpu = {
                "index": i,
                "name": name.value.decode(),
                "temperature_c": temp.value,
                "power_draw_w": round(float(pwr.value) / 1000.0, 1),
                "power_limit_w": 250.0,
                "utilization_gpu_pct": util.value
            }
            result["gpus"].append(gpu)
        nvml_ok = True
        nvml.nvmlShutdown()
        result["note"] = "NVML OK"
    else:
        result["note"] = "NVML init OK but 0 devices (kernel/lib version mismatch?)"
except Exception as e:
    result["note"] = f"NVML failed: {e}"

# --- Fallback: /sys/class/drm ---
if not nvml_ok or not result["gpus"]:
    drm_path = "/sys/class/drm"
    card_dirs = []
    for d in sorted(os.listdir(drm_path)):
        if d.startswith("card") and d[4:].isdigit() and os.path.isdir(os.path.join(drm_path, d)):
            card_dirs.append(d)

    for idx, card in enumerate(card_dirs):
        gpu_idx = int(card[4:])
        util_file = os.path.join(drm_path, card, "gpu_busy_percent")

        gpu = {
            "index": gpu_idx,
            "name": "Fallback",
            "temperature_c": "N/A",
            "power_draw_w": "N/A",
            "power_limit_w": 250.0,
            "utilization_gpu_pct": 0
        }

        try:
            if os.path.exists(util_file):
                gpu["utilization_gpu_pct"] = int(open(util_file).read().strip())
        except:
            pass

        result["gpus"].append(gpu)

    if not nvml_ok:
        result["note"] += " [fallback: /sys/class/drm]"

# Get system load
try:
    uptime_result = subprocess.run(["uptime"], capture_output=True, text=True)
    result["system_load"] = uptime_result.stdout.strip()
except:
    result["system_load"] = "unknown"

json_str = json.dumps(result, indent=2)
print(json_str)

# Write to output file
output_file = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('OUTPUT_FILE', '')
if output_file:
    with open(output_file, 'w') as f:
        f.write(json_str + '\n')
PYEOF
