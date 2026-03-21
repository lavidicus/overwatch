## Reverting Proxmox Kernel to 6.5 Due to NVIDIA GRID Driver Incompatibility

**Important Note:** Proxmox Kernel version 6.8-2 has been reported to be incompatible with NVIDIA GRID drivers. If you are experiencing issues with your NVIDIA GRID setup after upgrading to kernel 6.8-2, follow these instructions to revert to a compatible kernel version (6.5.13-5-pve).

**This document outlines the steps to revert your Proxmox VE system to kernel 6.5.13-5-pve.**

**Prerequisites:**

* You have shell access to your Proxmox VE host (via SSH or the Proxmox VE console).
* You have a stable internet connection.

**Instructions:**

**Step 1: Install the Older Kernel Package**

Open a shell and execute the following command:

```bash
apt install proxmox-kernel-6.5.13-5-pve
```

This command will download and install the desired kernel package. You may be prompted to confirm the installation; type `Y` and press Enter.

**Step 2: Install Kernel Headers**

Next, install the corresponding kernel headers:

```bash
apt install proxmox-headers-6.5.13-5-pve
```

This ensures compatibility between the kernel and any kernel modules you may have installed.  Again, confirm the installation if prompted.

**Step 3: Pin the Kernel as the Default Boot Option**

This step tells Proxmox to prioritize booting into the 6.5 kernel.  Execute the following command:

```bash
proxmox-boot-tool kernel pin 6.5.13-5-pve
```

This command sets the specified kernel as the preferred boot option.

**Step 4: Refresh the Boot Configuration**

Refresh the boot configuration to apply the changes:

```bash
proxmox-boot-tool refresh
```

This command updates the bootloader configuration with the new kernel priority.

**Step 5: Reboot the System**

Finally, reboot the Proxmox VE host to apply the changes:

```bash
reboot
```

The system will now boot into kernel 6.5.13-5-pve.



**Verification:**

After the reboot, you can verify the running kernel version by executing the following command:

```bash
uname -r
```

The output should be: `6.5.13-5-pve`

**Important Considerations:**

* **Backup:** Before performing these steps, it's always a good practice to have a recent backup of your Proxmox VE system.
* **Dependencies:** Ensure your system is up-to-date before starting.  Consider running `apt update` and `apt upgrade` before proceeding.
* **Troubleshooting:** If you encounter any issues during the process, consult the Proxmox documentation or seek assistance from the Proxmox community forums.