
## 1. Add the following to end of the VMID.Conf file:

```
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 509:* rwm
lxc.cgroup2.devices.allow: c 511:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file

```

## 2. Pull NVIDIA drivers from Host and Install

```
scp -r root@3usm:/root/Guest_Drivers/NVIDIA-Linux-x86_64-535.129.03-grid.run .

chmod +x NVIDIA-Linux-x86_64-535.129.03-grid.run
./NVIDIA-Linux-x86_64-535.129.03-grid.run --check
# answer "no" when it asks if it should update X config
./NVIDIA-Linux-x86_64-535.129.03-grid.run --no-kernel-module
```

## 3. Reboot LXC and confirm NVIDA passthrough

```
nvidia-smi
```

## 4. Add NVIDIA Licensing
```
```shell
mkdir -p /etc/nvidia/ClientConfigToken
wget --no-check-certificate -O /etc/nvidia/ClientConfigToken/client_configuration_token_$(date '+%d-%m-%Y-%H-%M-%S').tok https://172.16.254.14/-/client-token

# Restart nvidia-gridd service
service nvidia-gridd restart


```


# Windows NVIDIA Licensing

1. Download client-token setup licensing

```
# Open Powershell (Administrator)
curl.exe --insecure -L -X GET https://172.16.254.14/-/client-token -o "C:\Program Files\NVIDIA Corporation\vGPU Licensing\ClientConfigToken\client_configuration_token_$($(Get-Date).tostring('dd-MM-yy-hh-mm-ss')).tok"

# Restart Service

```

# Restarting Host NVIDIA Card
```
systemctl restart nvidia-vgpu-mgr

```