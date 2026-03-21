## Proxmox Repository Update Guide - Removing Subscription Requirement

This guide details how to update your Proxmox repository sources to remove the subscription requirement, allowing you to receive updates without a paid subscription. This is applicable for Proxmox VE installations.

**Important:** This guide assumes you are comfortable using a command-line interface (CLI) and have root or sudo access.

**Steps:**

**1. Update Apt Source Lists**

This section involves modifying your APT source lists to point to the non-subscription repositories.

**1.1 Add Non-Subscription Repositories**

You will be using `vi` (or your preferred text editor) to modify configuration files.

* **1.1.1 PVE Repository:**
   * Open the `pve-install-repo.list` file:
     ```bash
     vi /etc/apt/sources.list.d/pve-install-repo.list
     ```
   * Add the following line to the file:
     ```
     deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription
     ```
   * Save and close the file.

* **1.1.2 Ceph Repository:**
   * Open the `ceph.list` file:
     ```bash
     vi /etc/apt/sources.list.d/ceph.list
     ```
   * **Choose ONE of the following options based on your Proxmox version:**
     * **For Proxmox VE 17.2:** Add the following line:
       ```
       deb http://download.proxmox.com/debian/ceph-quincy bookworm no-subscription
       ```
     * **For Proxmox VE 18.2.1:** Add the following line:
       ```
       deb http://download.proxmox.com/debian/ceph-reef bookworm no-subscription
       ```
   * Save and close the file.  **Ensure you select the correct Ceph version for your Proxmox VE version.**

* **1.1.3 Remove Enterprise Repository:**
   * Remove the enterprise repository file:
     ```bash
     rm -f /etc/apt/sources.list.d/pve-enterprise.list
     ```

**1.2 Update Package Lists and Upgrade System**

* Update the package lists to reflect the changes:
  ```bash
  apt-get update -y
  ```
* Upgrade the system to the latest versions:
  ```bash
  apt-get upgrade -y
  ```

**Optional: Key Loading (If Needed)**

If you encounter errors related to repository keys, you may need to load the Proxmox release key:

```bash
wget http://download.proxmox.com/debian/proxmox-release-bookworm.gpg -O /etc/apt/trusted.gpg.d/proxmox-release-bookworm.gpg
```

**Verification:**

After completing these steps, you should be able to install updates without being prompted for a subscription.  You can verify this by attempting to upgrade your system again:

```bash
sudo apt-get update && sudo apt-get upgrade
```

If the upgrade proceeds without subscription prompts, the configuration is successful.



**Disclaimer:**  Using non-subscription repositories means you will not receive official support from Proxmox.  It's recommended to understand the implications before proceeding.