#!/usr/bin/env python3
import sys, subprocess, json, re

def get_temp(dev):
    try:
        out = subprocess.check_output(["smartctl", "-j", "-A", f"/dev/{dev}"], stderr=subprocess.DEVNULL)
        j = json.loads(out)
        # Check ata_smart_attributes.table
        ata = j.get('ata_smart_attributes', {})
        table = ata.get('table', []) if ata else j.get('ata_smart_attributes', {}).get('table', [])
        for a in table:
            name = a.get('name', '') or ''
            if 'temperature' in name.lower():
                raw = a.get('raw', {})
                # raw.value preferred
                if isinstance(raw, dict) and raw.get('value') is not None:
                    return str(int(raw.get('value')))
                # raw.string may contain value
                s = raw.get('string') if isinstance(raw, dict) else str(raw)
                if s:
                    m = re.search(r"(\d{1,3})", str(s))
                    if m:
                        return m.group(1)
                # fallback to attribute 'value'
                if a.get('value') is not None:
                    return str(int(a.get('value')))
        # top-level temperature_celsius
        if 'temperature_celsius' in j:
            tc = j['temperature_celsius']
            if isinstance(tc, dict) and tc.get('value') is not None:
                return str(int(tc.get('value')))
        # try scanning any numbers in SMART JSON
        txt = json.dumps(j)
        m = re.search(r'"Temperature[_A-Za-z0-9]*".*?([0-9]{1,3})', txt)
        if m:
            return m.group(1)
    except Exception:
        pass
    return 'N/A'

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('N/A')
        sys.exit(0)
    dev = sys.argv[1]
    print(get_temp(dev))
