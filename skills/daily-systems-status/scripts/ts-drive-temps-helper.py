#!/usr/bin/env python3
import sys, subprocess, json, re

def temp_for_device(dev):
    try:
        out = subprocess.check_output(["smartctl", "-j", "-A", f"/dev/{dev}"], stderr=subprocess.DEVNULL)
        j = json.loads(out)
    except Exception:
        return 'N/A'
    # Prefer ATA attributes table
    ata = j.get('ata_smart_attributes') or {}
    table = ata.get('table') if isinstance(ata, dict) else []
    for entry in (table or []):
        name = (entry.get('name') or '').lower()
        if 'temperature' in name or entry.get('id') in (190, 194):
            raw = entry.get('raw', {})
            # raw may be dict with 'string' or 'value'
            if isinstance(raw, dict):
                s = raw.get('string') or ''
                m = re.search(r"(\d{1,3})", str(s))
                if m:
                    return m.group(1)
                if raw.get('value') is not None:
                    v = raw.get('value')
                    try:
                        if int(v) >= 0 and int(v) < 200:
                            return str(int(v))
                    except Exception:
                        pass
            else:
                s = str(raw)
                m = re.search(r"(\d{1,3})", s)
                if m:
                    return m.group(1)
    # top-level field
    tc = j.get('temperature_celsius')
    if isinstance(tc, dict) and tc.get('value') is not None:
        try:
            return str(int(tc.get('value')))
        except Exception:
            pass
    # fallback: scan SMART text for Temperature_Celsius line
    try:
        txt = subprocess.check_output(["smartctl", "-A", f"/dev/{dev}"], stderr=subprocess.DEVNULL).decode()
        m = re.search(r'Temperature_Celsius.*?(\d{1,3})', txt)
        if m:
            return m.group(1)
        m = re.search(r'Airflow_Temperature_Cel.*?(\d{1,3})', txt)
        if m:
            return m.group(1)
    except Exception:
        pass
    return 'N/A'

if __name__ == '__main__':
    devs = ['sda','sdb','sdc','sdd']
    if len(sys.argv) > 1:
        devs = sys.argv[1:]
    out = []
    for d in devs:
        out.append(temp_for_device(d))
    print(' '.join(out))
