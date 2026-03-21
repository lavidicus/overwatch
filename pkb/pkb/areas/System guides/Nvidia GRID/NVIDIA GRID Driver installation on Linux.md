
### Prerequisites
```
sudo apt -y install build-essential dkms gcc make perl \
  linux-headers-$(uname -r) pkg-config libglvnd-dev

```
### Remove Linux "Nouveau" driver
```
sudo tee /etc/modprobe.d/blacklist-nouveau.conf >/dev/null <<'EOF'
blacklist nouveau
options nouveau modeset=0
EOF
```
### Update system and reboot
```
sudo update-initramfs -u
sudo reboot
```
### Verify "Nouveau" driver removed
```
lsmod | grep nouveau || echo "nouveau not loaded"

# Should respond nouveau not loaded.
```

### Install NVIDIA (.run) driver
```
#VM or Host installation
sudo ./NVIDIA-Linux-x86_64-535.129.03-grid.run --dkms
```

```
#PVE Container installation
./NVIDIA-Linux-x86_64-535.129.03-grid.run --no-kernel-module
```