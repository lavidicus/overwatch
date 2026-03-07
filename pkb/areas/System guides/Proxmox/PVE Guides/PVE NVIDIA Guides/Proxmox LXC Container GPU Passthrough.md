## Proxmox LXC Container GPU Passthrough - Instructional Guide

This guide details how to configure GPU passthrough for an LXC container in Proxmox. It assumes you have a Proxmox VE environment with a dedicated GPU you want to make available to a container.

**Prerequisites:**

*   A Proxmox VE environment.
*   A GPU installed in your Proxmox host.
*   Basic familiarity with the Proxmox web interface and SSH.

**Step 1: Host Preparation - Identify Devices and Permissions**

This step involves identifying the device numbers for your NVIDIA GPU and preparing the Proxmox host for passthrough.

1.  **SSH into your Proxmox host.**  Use your preferred SSH client to connect to the Proxmox server.

2.  **Identify Nvidia Devices and Numbers:**  Run the following command to list NVIDIA devices:

    ```bash
    ls -l /dev/nvidia*
    ```

    You should see output similar to this (the numbers *will* likely differ on your system):

    ```
    crw-rw-rw- 1 root root 195, 0 May 15 10:00 /dev/nvidia0  # GPU device
    crw-rw-rw- 1 root root 195, 255 May 15 10:00 /dev/nvidactl # Control device
    crw-rw-rw- 1 root root 195, 254 May 15 10:00 /dev/nvidia-modeset # Optional, but good to include
    crw-rw-rw- 1 root root 236, 0 May 15 10:00 /dev/nvidia-uvm # Unified Virtual Memory
    crw-rw-rw- 1 root root 236, 1 May 15 10:00 /dev/nvidia-uvm-tools # UVM Tools
    ```

    **Important:**  Note the major and minor numbers for each device.  You'll need these in the next step.  For example, `/dev/nvidia0` has major number `195` and minor number `0`.  `/dev/nvidia-uvm` has major number `236` and minor number `0`.  Also note the `/dev/dri/renderD128` device, and its corresponding number.

**Step 2: Configure LXC Container Configuration File**

Now, you'll edit the LXC container configuration file to enable GPU passthrough.

1.  **Edit the Container Configuration:**  Access the LXC container configuration file.  This is typically located in `/etc/pve/lxc/<container_id>.conf`.  You can edit it directly on the Proxmox host via SSH, or download it, edit it locally, and upload it back.

2.  **Add Device Access and Mount Points:** Add the following lines to the *end* of the configuration file. **Replace the major/minor numbers with the ones you found in Step 1.**  Also, replace `105` with the GID of your render/video group.

    ```
    # Allow access to Nvidia devices (Replace numbers with YOURS)
    lxc.cgroup2.devices.allow: c 195:* rwm # Allows access to all devices with major number 195
    lxc.cgroup2.devices.allow: c 236:* rwm # Allows access to all devices with major number 236 (for nvidia-uvm)
    lxc.cgroup2.devices.allow: c 226:128 rwm # Allows access to /dev/dri/renderD128 (Replace with YOURS)

    # Mount the devices into the container
    lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file 0 0
    lxc.mount.entry: /dev/nvidactl dev/nvidactl none bind,optional,create=file 0 0
    lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file 0 0 # Optional but recommended
    lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file 0 0
    lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file 0 0
    lxc.mount.entry: /dev/dri/renderD128 dev/dri/renderD128 none bind,optional,create=file 0 0 # Mount the render device

    # Map the host's render/video group GID into the container
    # Format: lxc.idmap: <type> <host_id> <container_id> <count>
    # We map the single GID (count=1)
    lxc.idmap: g <HOST_GID> <CONTAINER_GID> 1 # Map host GID 105 (render) to container GID 105
    ```

    **Important:** Replace `<HOST_GID>` and `<CONTAINER_GID>` with the correct GIDs.  Typically, the container GID will be the same as the host GID.

3.  **Save the Configuration File:** Save the changes to the LXC container configuration file.

**Step 3: Restart the LXC Container**

1.  **Restart the Container:** Restart the LXC container for the changes to take effect.  You can do this from the Proxmox web interface or via the command line:

    ```bash
    pct restart <container_id>
    ```

**Step 4: Verify the Configuration**

1.  **Login to the Container:** Log in to the LXC container.

2.  **Check Device Availability:** Verify that the NVIDIA devices are available within the container.  You can use commands like `ls -l /dev/nvidia*` or `lspci | grep NVIDIA`.

**Important Considerations:**

*   **Driver Installation:** Ensure that the appropriate NVIDIA drivers are installed *within* the LXC container.
*   **Security:**  Be mindful of the security implications of granting access to devices.
*   **Resource Limits:** Consider setting resource limits for the LXC container to prevent it from consuming excessive resources.
*   **GID Mapping:**  Correct GID mapping is crucial for proper access control.

This detailed guide should help you configure GPU passthrough for your LXC containers. Remember to adapt the instructions to your specific environment and requirements.