#!/usr/bin/env python3
"""
Aggregate Node2 GPU metrics for a given date from all gpu-metrics-* log files.
Handles multiple log formats found in /home/localadmin/logs/.
"""

import json
import re
import glob
import os
import sys
from collections import defaultdict

DATE = sys.argv[1] if len(sys.argv) > 1 else "2026-04-23"
DATE_COMPACT = DATE.replace("-", "")
LOG_DIR = "/home/localadmin/logs"

OUT_FILE = os.path.join(LOG_DIR, f"node2-gpu-metrics-summary-{DATE}.json")

samples = []  # list of dicts: timestamp, index, temp, power_draw, util_gpu, mem_used, mem_total, power_limit

# ── Collect matching files ──
files_processed = []

patterns = [
    f"gpu-metrics-{DATE}*",
    f"gpu-metrics-{DATE_COMPACT}*",
    f"gpu_metrics_{DATE}*",
    f"gpu_metrics_{DATE_COMPACT}*",
]

for pat in patterns:
    for fpath in sorted(glob.glob(os.path.join(LOG_DIR, pat))):
        if os.path.basename(fpath) not in files_processed:
            files_processed.append(os.path.basename(fpath))

# ── Parse each file ──
def extract_ts_from_filename(basename):
    """Try to pull a timestamp from the filename for samples without inline timestamps."""
    m = re.search(r'(\d{4}-\d{2}-\d{2})[_-](\d{2})(\d{2})(\d{2})', basename)
    if m:
        return f"{m.group(1)} {m.group(2)}:{m.group(3)}:{m.group(4)}"
    m = re.search(r'(\d{4}-\d{2}-\d{2})', basename)
    if m:
        return f"{m.group(1)} 00:00:00"
    return "unknown"

for fpath in files_processed:
    file_ts = extract_ts_from_filename(fpath)
    full = os.path.join(LOG_DIR, fpath)
    try:
        with open(full) as f:
            content = f.read()
    except Exception as e:
        print(f"  WARN: could not read {fpath}: {e}", file=sys.stderr)
        continue

    lines = content.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Format 1: CSV rows from nvidia-smi query
        # "0, Quadro P6000, 63, 71.78 W, 250.00 W, 0 %, 0 %, 22063 MiB, 24576 MiB"
        m = re.match(
            r'^(\d+),\s*Quadro\s*\w+,\s*(\d+),\s*([\d.]+)\s*W,\s*([\d.]+)\s*W,\s*(\d+)\s*%,?\s*(\d+)\s*%,?\s*(\d+)\s*MiB,\s*(\d+)\s*MiB',
            line
        )
        if m:
            idx, temp, pwr, pwr_lim, util, util_mem, mem_used, mem_total = m.groups()
            samples.append({
                "timestamp": file_ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": float(pwr_lim),
                "util_gpu": int(util),
                "util_mem": int(util_mem),
                "memory_used": int(mem_used),
                "memory_total": int(mem_total),
            })
            continue

        # Format 2: "0, Quadro P6000, 73.68 W, 250.00 W, 76, 0 %, 0 %"
        # (no memory fields)
        m = re.match(
            r'^(\d+),\s*Quadro\s*\w+,\s*([\d.]+)\s*W,\s*([\d.]+)\s*W,\s*(\d+),\s*(\d+)\s*%,?\s*(\d+)\s*%',
            line
        )
        if m:
            idx, pwr, pwr_lim, temp, util, util_mem = m.groups()
            samples.append({
                "timestamp": file_ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": float(pwr_lim),
                "util_gpu": int(util),
                "util_mem": int(util_mem),
                "memory_used": None,
                "memory_total": None,
            })
            continue

        # Format 3: "0,QuadroP6000,44,21737,24576,0,66.43"
        # idx,model,temp,mem_used,mem_total,util,power
        m = re.match(
            r'^(\d+),\s*Quadro\w+,\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)',
            line
        )
        if m:
            idx, temp, mem_used, mem_total, util, pwr = m.groups()
            samples.append({
                "timestamp": file_ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": 250.0,
                "util_gpu": int(util),
                "util_mem": None,
                "memory_used": int(mem_used),
                "memory_total": int(mem_total),
            })
            continue

        # Format 4: "0, Quadro P6000, 78, 74.50, 250.00, 0, 23537, 24576"
        # idx,model,temp,power,pwr_limit,util,mem_used,mem_total
        m = re.match(
            r'^(\d+),\s*Quadro\s*\w+,\s*(\d+),\s*([\d.]+),\s*([\d.]+),\s*(\d+),\s*(\d+),\s*(\d+)',
            line
        )
        if m:
            idx, temp, pwr, pwr_lim, util, mem_used, mem_total = m.groups()
            samples.append({
                "timestamp": file_ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": float(pwr_lim),
                "util_gpu": int(util),
                "util_mem": None,
                "memory_used": int(mem_used),
                "memory_total": int(mem_total),
            })
            continue

        # Format 5: CSV header + data rows (timestamped CSV)
        # "2026-04-23_084117,0,Quadro P6000,55,69.06,250.00,0,22,24576,24576"
        m = re.match(
            r'^([\d_-]+),\s*(\d+),\s*Quadro\s*\w+,\s*(\d+),\s*([\d.]+),\s*([\d.]+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)',
            line
        )
        if m:
            ts, idx, temp, pwr, pwr_lim, util, util_mem, mem_used, mem_total = m.groups()
            samples.append({
                "timestamp": ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": float(pwr_lim),
                "util_gpu": int(util),
                "util_mem": int(util_mem),
                "memory_used": int(mem_used),
                "memory_total": int(mem_total),
            })
            continue

        # Format 6: CSV with header "index, name, temperature.gpu, power.draw [W], ..."
        # "0, Quadro P6000, 83, 81.71 W, 1645 MHz, 58 %, 42 %"
        m = re.match(
            r'^(\d+),\s*Quadro\s*\w+,\s*(\d+),\s*([\d.]+)\s*W,\s*[\d]+\s*MHz,\s*(\d+)\s*%,?\s*(\d+)\s*%',
            line
        )
        if m:
            idx, temp, pwr, util, util_mem = m.groups()
            samples.append({
                "timestamp": file_ts,
                "index": int(idx),
                "temperature": int(temp),
                "power_draw": float(pwr),
                "power_limit": 250.0,
                "util_gpu": int(util),
                "util_mem": int(util_mem),
                "memory_used": None,
                "memory_total": None,
            })
            continue

        # Format 7: Bracketed single-line
        # "[2026-04-23 10:52:55 UTC] GPU 0: P6000 | 58°C | 70W | 22063/24576 MiB | GPU 1: P6000 | 48°C | 66W | 23553/24576 MiB"
        m = re.search(
            r'\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+\w+\]',
            line
        )
        ts = m.group(1) if m else "unknown"
        gpu_matches = re.findall(
            r'GPU\s+(\d):\s*\w+\s*\|\s*(\d+)°C\s*\|\s*([\d.]+)W\s*\|\s*(\d+)/(\d+)\s*MiB',
            line
        )
        if gpu_matches:
            for gidx, temp, pwr, mem_used, mem_total in gpu_matches:
                samples.append({
                    "timestamp": ts,
                    "index": int(gidx),
                    "temperature": int(temp),
                    "power_draw": float(pwr),
                    "power_limit": 250.0,
                    "util_gpu": 0,
                    "util_mem": None,
                    "memory_used": int(mem_used),
                    "memory_total": int(mem_total),
                })

# ── Deduplicate by (timestamp, index), keep most complete ──
seen = {}
for s in samples:
    key = (s["timestamp"], s["index"])
    if key not in seen:
        seen[key] = s
    else:
        existing = seen[key]
        new_count = sum(1 for v in s.values() if v is not None)
        old_count = sum(1 for v in existing.values() if v is not None)
        if new_count > old_count:
            seen[key] = s

samples = sorted(seen.values(), key=lambda s: (s["timestamp"], s["index"]))

# ── Group by GPU ──
gpu_data = defaultdict(list)
for s in samples:
    gpu_data[s["index"]].append(s)

def safe_stats(values, default=0):
    vals = [v for v in values if v is not None]
    if not vals:
        return {"min": default, "max": default, "avg": default, "last": default, "count": 0}
    return {
        "min": round(min(vals), 2),
        "max": round(max(vals), 2),
        "avg": round(sum(vals) / len(vals), 2),
        "last": round(vals[-1], 2),
        "count": len(vals),
    }

result = {
    "date": DATE,
    "generated_utc": "2026-04-23T13:37:00Z",
    "total_samples": len(samples),
    "files_processed": files_processed,
    "gpu_0": None,
    "gpu_1": None,
    "summary": None,
}

for gpu_id in [0, 1]:
    data = gpu_data.get(gpu_id, [])
    if not data:
        continue

    temps = [s["temperature"] for s in data]
    mem_used = [s["memory_used"] for s in data if s["memory_used"] is not None]
    mem_total = [s["memory_total"] for s in data if s["memory_total"] is not None]
    util_gpu = [s["util_gpu"] for s in data if s["util_gpu"] is not None]
    util_mem = [s["util_mem"] for s in data if s["util_mem"] is not None]
    power = [s["power_draw"] for s in data]
    pwr_limit = [s["power_limit"] for s in data if s["power_limit"] is not None]

    vram_pcts = []
    for s in data:
        if s["memory_used"] is not None and s["memory_total"] is not None and s["memory_total"] > 0:
            vram_pcts.append(round(s["memory_used"] / s["memory_total"] * 100, 1))

    result[f"gpu_{gpu_id}"] = {
        "model": "Quadro P6000",
        "vram_total_mib": mem_total[-1] if mem_total else 24576,
        "temperature": safe_stats(temps),
        "memory_used_mib": safe_stats(mem_used),
        "utilization_gpu": safe_stats(util_gpu),
        "utilization_memory": safe_stats(util_mem) if util_mem else None,
        "power_draw_w": safe_stats(power),
        "power_limit_w": safe_stats(pwr_limit),
        "vram_usage_pct": safe_stats(vram_pcts),
    }

# ── Summary ──
g0 = result["gpu_0"] or {}
g1 = result["gpu_1"] or {}

total_power_idle = (g0.get("power_draw_w", {}).get("avg", 0) or 0) + (g1.get("power_draw_w", {}).get("avg", 0) or 0)
kwh_per_day = (total_power_idle / 1000.0) * 24.0
cost_per_day = kwh_per_day * 0.16  # $/kWh estimate

# Determine status
status = "idle"
for gpu_list in gpu_data.values():
    for s in gpu_list:
        if s.get("util_gpu") and s["util_gpu"] > 0:
            status = "active"
            break

result["summary"] = {
    "total_vram_mib": (g0.get("vram_total_mib") or 0) + (g1.get("vram_total_mib") or 0),
    "total_vram_used_avg_mib": round(
        (g0.get("memory_used_mib", {}).get("avg", 0) or 0) +
        (g1.get("memory_used_mib", {}).get("avg", 0) or 0), 1
    ),
    "avg_gpu0_temp": g0.get("temperature", {}).get("avg", 0),
    "avg_gpu1_temp": g1.get("temperature", {}).get("avg", 0),
    "max_gpu0_temp": g0.get("temperature", {}).get("max", 0),
    "max_gpu1_temp": g1.get("temperature", {}).get("max", 0),
    "avg_gpu0_power_w": g0.get("power_draw_w", {}).get("avg", 0),
    "avg_gpu1_power_w": g1.get("power_draw_w", {}).get("avg", 0),
    "peak_gpu0_power_w": g0.get("power_draw_w", {}).get("max", 0),
    "peak_gpu1_power_w": g1.get("power_draw_w", {}).get("max", 0),
    "avg_total_power_w": round(total_power_idle, 2),
    "kwh_per_day": round(kwh_per_day, 3),
    "cost_per_day_usd": round(cost_per_day, 4),
    "avg_gpu0_util": g0.get("utilization_gpu", {}).get("avg", 0),
    "avg_gpu1_util": g1.get("utilization_gpu", {}).get("avg", 0),
    "avg_vram_pct_gpu0": g0.get("vram_usage_pct", {}).get("avg", 0),
    "avg_vram_pct_gpu1": g1.get("vram_usage_pct", {}).get("avg", 0),
    "status": status,
}

# Write output
with open(OUT_FILE, "w") as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
print(f"\n✅ Written to {OUT_FILE}")
