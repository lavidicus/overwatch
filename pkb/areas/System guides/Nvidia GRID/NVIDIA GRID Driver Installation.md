# Status: Working


### 1. Update / Upgrade linux kernel
```
1.1 # apt update -y && apt upgrade -y
```

### 2. Download Kernel headers and required software packages
```
2.1 # apt install -y git build-essential dkms pve-headers mdevctl wget curl
```

### 3. Enabling IOMMU (Passthrough)
```
3.1 # If the system boot partition is ZFS: vi /etc/kernel/cmdline
3.1.1 # Locate the line: `root=ZFS=rpool/ROOT/pve-1 boot=zfs`
3.1.2 # add the following: `intel_iommu=on iommu=pt` after "boot-zfs"
3.2 # proxmox-boot-tool refresh
```
### 4. Load required kernel modules and blacklisting opensource nvidia drivers
```
4.1 #  echo -e "vfio\nvfio_iommu_type1\nvfio_pci" >> /etc/modules

4.2 # echo "blacklist nouveau" >> /etc/modprobe.d/blacklist.conf
```

### 5. Apply kernel configuration
```
5.1 # update-initramfs -u -k all
5.2 # systemctl reboot
```

### 6. Installation of NVIDIA GRID driver
```
6.1 # chmod +x NVIDIA-Linux-x6_64-{version}-vgpu-kvm.run
6.2 # ./NVIDIA-Linux-x6_64-{version}-vgpu-kvm.run --dkms
```

### 7. Download Client-Token
#### Linux
```
7.1 # curl --insecure -L -X GET https://<dls-hostname-or-ip>/-/client-token -o /etc/nvidia/ClientConfigToken/client_configuration_token_$(date '+%d-%m-%Y-%H-%M-%S').tok
# or
wget --no-check-certificate -O /etc/nvidia/ClientConfigToken/client_configuration_token_$(date '+%d-%m-%Y-%H-%M-%S').tok https://<dls-hostname-or-ip>/-/client-token

# Restart nvidia-gridd service:
7.2 # service nvidia-gridd restart

# Check licensing status
7.3 # nvidia-smi -q |grep "License"
```
#### Windows
```
Power-Shell (run as Administrator)
7.4 # curl.exe --insecure -L -X GET https://<dls-hostname-or-ip>/-/client-token -o "C:\Program Files\NVIDIA Corporation\vGPU Licensing\ClientConfigToken\client_configuration_token_$($(Get-Date).tostring('dd-MM-yy-hh-mm-ss')).tok"

# Restart NvContainerLocalSystem service:
7.5 # Restart-Service NVDisplay.ContainerLocalSystem
7.6 # & 'nvidia-smi' -q  | Select-String "License"




```

## Example
```
Linux

# curl --insecure -L -X GET https://172.16.254.19/-/client-token -o /etc/nvidia/ClientConfigToken/client_configuration_token_$(date '+%d-%m-%Y-%H-%M-%S').tok

Windows

> curl.exe --insecure -L -X GET https://172.16.254.19/-/client-token -o "C:\Program Files\NVIDIA Corporation\vGPU Licensing\ClientConfigToken\client_configuration_token_$($(Get-Date).tostring('dd-MM-yy-hh-mm-ss')).tok"

```
# Direct Passthrough VFIO.conf
```
options vfio-pci ids=10de:2182,10de:1aeb,10de:1aec,10de:1aed
```