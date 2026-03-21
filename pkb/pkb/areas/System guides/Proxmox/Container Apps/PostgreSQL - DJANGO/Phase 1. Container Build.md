
**Proxmox Container (LXC) Setup & Base Installation**

1. **Create LXC Container in Proxmox:**
    
    - Use a recent Debian or Ubuntu template (e.g., Debian 11/12, Ubuntu 22.04).
        
    - Allocate sufficient resources (e.g., 1-2 CPU cores, 1-2 GB RAM, 10-20 GB disk - adjust as needed).
        
    - Configure networking (static IP recommended).
        
    - Start the container.
        
2. **Access the Container Console/SSH.**
    
3. **Update & Install Base Packages:**
    
    ```
    apt update && apt upgrade -y
    apt install -y python3 python3-pip python3-venv openssl sudo nginx curl git
    ```


