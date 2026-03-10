# OpenRGB PNY RTX 3090 RGB Control

**Date:** 2026-03-10  
**Host:** Olla (172.16.254.100)  
**GPU:** PNY GeForce RTX 3090 (GA102)

---

## Installation Summary

### Package Details
- **Version:** OpenRGB 0.9+ (git1876)
- **Git Commit:** 5d7565bc5995a2479141487a95725089314ded61
- **Build Date:** Tue, 10 Mar 2026 04:50:55 +0000
- **Binary:** `/usr/bin/openrgb` (11 MB)

### Installed Files
- **Binary:** `/usr/bin/openrgb`
- **Udev Rules:** `/usr/lib/udev/rules.d/60-openrgb.rules` (221 KB)
- **Desktop Entry:** `/usr/share/applications/org.openrgb.OpenRGB.desktop`
- **Icon:** `/usr/share/icons/hicolor/128x128/apps/org.openrgb.OpenRGB.png`
- **Metainfo:** `/usr/share/metainfo/org.openrgb.OpenRGB.metainfo.xml`
- **Systemd Service:** `/usr/lib/systemd/system/openrgb.service`
- **Tmpfiles:** `/usr/lib/tmpfiles.d/openrgb.conf`

### Installation Steps Performed

1. **Clone OpenRGB repository:**
   ```bash
   git clone https://gitlab.com/CalcProgrammer1/OpenRGB /tmp/OpenRGB
   ```

2. **Install build dependencies (Ubuntu 24.04):**
   ```bash
   sudo apt install -y build-essential qtbase5-dev qtchooser qt5-qmake \
     qtbase5-dev-tools libusb-1.0-0-dev libhidapi-dev pkgconf \
     libmbedtls-dev qttools5-dev-tools
   ```

3. **Configure build:**
   ```bash
   cd /tmp/OpenRGB
   mkdir -p build && cd build
   qmake ../OpenRGB.pro
   ```

4. **Compile:**
   ```bash
   make -j$(nproc)
   ```

5. **Install:**
   ```bash
   sudo make install
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

---

## Usage

### Running OpenRGB

```bash
# Run with root privileges (required for hardware access)
sudo openrgb
```

**Note:** OpenRGB requires:
- Direct hardware access (SMBus/I2C/USB)
- A display server (X11 or Wayland)
- Root privileges for full device detection

### PNY RTX 3090 Support

PNY Lovelace GPUs (RTX 3090) are supported via the `PNYLovelaceGPUController` driver.

**Expected behavior:**
- GPU should appear in device list as "PNY [GPU Name] RGB"
- LED zones typically include:
  - Backplate LEDs
  - Logo/branding LEDs
  - Edge lighting strips

### Available Controllers

OpenRGB supports 400+ RGB devices including:
- NVIDIA GPUs (various manufacturers)
- AMD GPUs (limited support)
- Motherboards (ASUS, MSI, Gigabyte, ASRock)
- RAM kits (Corsair, G.Skill, Kingston)
- RGB fans and lighting strips
- Keyboards, mice, headsets
- Smart lighting (Philips Hue, LIFX, Nanoleaf)

---

## Hardware Access Requirements

### SMBus/I2C Access

OpenRGB needs access to the GPU's SMBus controller. On Ubuntu:

```bash
# Verify I2C device exists
ls /dev/i2c-*

# Add user to i2c group (optional, for non-root access)
sudo usermod -aG i2c $USER
```

### Udev Rules

The installed udev rules (`/usr/lib/udev/rules.d/60-openrgb.rules`) grant access to:
- USB devices with OpenRGB-known vendor/product IDs
- HIDRAW devices for keyboard/mouse RGB
- SMBus/I2C devices for motherboard and GPU controllers

---

## Troubleshooting

### Device Not Detected

1. **Check SMBus access:**
   ```bash
   sudo i2cdetect -y 1  # Replace '1' with correct bus number
   ```

2. **Verify GPU is visible:**
   ```bash
   lspci -v | grep -A 5 NVIDIA
   ```

3. **Check kernel modules:**
   ```bash
   lsmod | grep -E 'i2c-nvidia-gpu|nvidia'
   ```

4. **Try running with verbose output:**
   ```bash
   sudo openrgb --verbose
   ```

### Permission Denied

- Ensure udev rules are installed: `ls /usr/lib/udev/rules.d/60-openrgb.rules`
- Reload rules: `sudo udevadm control --reload-rules`
- Run as root or add user to i2c group

### Build from Source Again

```bash
cd /tmp/OpenRGB
git pull origin master
make clean
make -j$(nproc)
sudo make install
```

---

## References

- **OpenRGB Website:** https://openrgb.org
- **Supported Devices:** https://openrgb.org/devices.html
- **GitLab Repository:** https://gitlab.com/CalcProgrammer1/OpenRGB
- **Udev Rules Guide:** https://gitlab.com/CalcProgrammer1/OpenRGB/-/blob/master/Documentation/UdevRules.md
- **GitHub Wiki:** https://gitlab.com/OpenRGBDevelopers/OpenRGB-Wiki

---

## Related Work

- **Issue:** ITIL-ISSUE-OPENRGB-PNY-RTX3090-RGB-INSTALL (created: 2026-03-10)
- **Host:** Olla (172.16.254.100) - Ubuntu 24.04.4 LTS
- **GPU:** PNY GeForce RTX 3090 (GA102) passed through to VM

---

*Documented: 2026-03-10 by Sam*
