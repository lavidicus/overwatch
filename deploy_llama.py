#!/usr/bin/env python3
"""Deploy llama-server.service to olla with sudo password."""

import subprocess
import sys

SUDO_PASS = "NAfb_22_lima"
OLLA_HOST = "localadmin@olla"

def run_cmd(cmd, input_data=None):
    """Run command with optional stdin input."""
    print(f"Running: {cmd}")
    proc = subprocess.run(
        cmd,
        shell=True,
        input=input_data,
        text=True,
        capture_output=True
    )
    if proc.returncode != 0:
        print(f"STDERR: {proc.stderr}")
    return proc.returncode == 0

def main():
    # Step 1: Copy service file to olla
    print("Step 1: Copying service file to olla...")
    if not run_cmd(f"scp llama-server.service {OLLA_HOST}:/tmp/llama-server.service"):
        print("ERROR: Failed to copy service file")
        sys.exit(1)
    print("✅ Service file copied")
    
    # Step 2: Deploy on olla
    print("\nStep 2: Deploying on olla...")
    
    deploy_cmds = [
        f"echo '{SUDO_PASS}' | sudo -S cp /tmp/llama-server.service /etc/systemd/system/llama-server.service",
        f"echo '{SUDO_PASS}' | sudo -S systemctl daemon-reload",
        f"echo '{SUDO_PASS}' | sudo -S systemctl restart llama-server"
    ]
    
    for cmd in deploy_cmds:
        if not run_cmd(f"ssh {OLLA_HOST} '{cmd}'"):
            print(f"ERROR: Failed to execute: {cmd}")
            sys.exit(1)
    
    print("✅ Deployment commands executed")
    
    # Step 3: Verify
    print("\nStep 3: Verifying deployment...")
    verify_cmd = f"ssh {OLLA_HOST} 'sleep 3 && journalctl -u llama-server -n 10 --no-pager | grep -E \"(Active|ctx-size)\"'"
    run_cmd(verify_cmd)
    
    print("\n✅ Deployment complete!")

if __name__ == "__main__":
    main()