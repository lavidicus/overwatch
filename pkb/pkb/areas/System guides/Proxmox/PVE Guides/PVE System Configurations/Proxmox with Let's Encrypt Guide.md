## Securing Your Proxmox VE with Let's Encrypt: A Step-by-Step Guide

This guide will walk you through the process of securing your Proxmox VE web interface with a free Let's Encrypt SSL certificate. This ensures encrypted communication between your browser and your Proxmox server.

**Prerequisites:**

* A Proxmox VE installation.
* A domain name pointing to your Proxmox server's IP address. (e.g., `ds.9xc.io`)
* Root access to your Proxmox server.
* Port 80 and 443 must be open and accessible.



**Step 1: Installing Certbot**

Certbot is the tool we'll use to obtain and renew our SSL certificate.  Since Proxmox is based on Debian, it's readily available in the package manager:

```bash
apt update  # Recommended to update package lists first
apt install certbot
```

**Step 2: Obtaining Your Certificate**

Now, we'll use Certbot to request a certificate for your domain.  This command uses the `--standalone` plugin, which temporarily starts a web server to verify domain ownership.

```bash
certbot certonly --standalone -d ds.9xc.io
```

* **Replace `ds.9xc.io` with your actual domain name.**
* You will be prompted to enter an email address for renewal and security notices.
* You may also be asked to agree to the Let's Encrypt terms of service.
*  Follow the on-screen prompts.  Certbot will attempt to verify your domain ownership and obtain the certificate.



**Step 3: Getting Your Certificate into Proxmox**

Now that you have the certificate, you need to copy it to the Proxmox configuration directory.

```bash
cp /etc/letsencrypt/live/<domain>/fullchain.pem /etc/pve/local/pveproxy-ssl.pem
cp /etc/letsencrypt/live/<domain>/privkey.pem /etc/pve/local/pveproxy-ssl.key
```

* **Important:** Replace `<domain>` with your actual domain name (e.g., `ds.9xc.io`).

**Step 4: Restarting the PVE Proxy**

After copying the certificate, you need to restart the Proxmox VE proxy service to apply the changes.

```bash
systemctl restart pveproxy
```

**Step 5: Setting up Automatic Renewal**

Let's Encrypt certificates expire after 90 days.  We need to automate the renewal process.

**5.1 Create the Renewal Script:**

Create a bash script to handle the certificate copy and proxy restart.  This script will be called by Certbot during renewal.

```bash
nano /usr/local/bin/renew-pve-certs.sh
```

Paste the following content into the file:

```bash
#!/bin/bash
cp /etc/letsencrypt/live/<domain>/fullchain.pem /etc/pve/local/pveproxy-ssl.pem
cp /etc/letsencrypt/live/<domain>/privkey.pem /etc/pve/local/pveproxy-ssl.key
systemctl restart pveproxy
```

* **Remember to replace `<domain>` with your actual domain name.**

Make the script executable:

```bash
chmod +x /usr/local/bin/renew-pve-certs.sh
```

**5.2 Edit the Cron Tab:**

Edit the system cron table to schedule automatic renewal.

```bash
crontab -e
```

Add the following line to the end of the file:

```
30 6 1,15 * * root /usr/bin/certbot renew --quiet --post-hook /usr/local/bin/renew-pve-certs.sh
```

* This line schedules Certbot to run on the 6th and 15th of every month at 6:30 AM.
* The `--quiet` flag suppresses output during renewal.
* The `--post-hook` option executes the `renew-pve-certs.sh` script after a successful renewal.



**Verification:**

* After completing these steps, access your Proxmox VE web interface via `https://yourdomain.com`.  You should see a valid SSL certificate in your browser.
* You can also check the certificate details in your browser to confirm it's issued by Let's Encrypt.



**Troubleshooting:**

* **Port 80/443 Blocked:** Ensure your firewall allows traffic on ports 80 and 443.
* **Domain Name Resolution:** Verify your domain name correctly resolves to your Proxmox server's IP address.
* **Certbot Errors:**  Check the Certbot logs for any errors during the certificate request or renewal process.  Logs are typically located in `/var/log/letsencrypt/`.



This guide provides a comprehensive overview of securing your Proxmox VE with Let's Encrypt.  Remember to replace placeholders with your actual domain name and adjust the script and cron job as needed.