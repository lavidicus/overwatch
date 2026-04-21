#!/usr/bin/env python3
"""Return space-separated NVMe drive temperatures for nvme0n1..nvme3n1"""
import subprocess, re, sys

def get_nvme_temp(dev):
    try:
        out = subprocess.check_output(
            ["smartctl", "-A", f"/dev/{dev}"],
            stderr=subprocess.DEVNULL
        ).decode()
        m = re.search(r'Temperature:\s+(\d+)\s+Celsius', out)
        if m:
            return m.group(1)
    except Exception:
        pass
    return 'N/A'

if __name__ == '__main__':
    devs = ['nvme0n1', 'nvme1n1', 'nvme2n1', 'nvme3n1']
    temps = [get_nvme_temp(d) for d in devs]
    print(' '.join(temps))
