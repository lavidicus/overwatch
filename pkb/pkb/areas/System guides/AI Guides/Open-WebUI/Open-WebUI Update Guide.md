## Updating Open WebUI: A Comprehensive Guide

This document outlines how to update your local Docker installation of Open WebUI to the latest version. You can choose between a manual update process or automate the process with Watchtower.

**Important Note:** Before proceeding, ensure you understand the implications of removing data.  Backups are always recommended!

---

### Manual Update

This method provides full control over the update process.

**Step 1: Stop and Remove the Current Container**

This stops the running container and removes it, *without* deleting the data stored in the Docker volume.

```bash
docker rm -f open-webui
```

**Step 2: Pull the Latest Docker Image**

This updates the Docker image, but doesn't affect the running container or its data.

```bash
docker pull ghcr.io/open-webui/open-webui:main
```

**Step 3: (Optional) Remove Existing Data (NOT RECOMMENDED unless necessary)**

**WARNING:** This will delete all your chat histories and other data! Only proceed if you want a clean slate.

```bash
docker volume rm open-webui
```

**Step 4: Start the Container with the Updated Image**

This starts the container with the updated image and either the existing volume (if you didn't remove it) or a new, empty volume.

```bash
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main
```

**For Nvidia GPU support, add `--gpus all` to the command:**

```bash
docker run -d -p 8080:8080 -v open-webui:/app/backend/data -e OLLAMA_BASE_URL=http://(OLLAMA IP):11434 --gpus all --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```

**Addressing Persistent Logout Issues:**

If you experience being logged out after updates, ensure you've set the `WEBUI_SECRET_KEY` environment variable.

* **When running the container:**

```bash
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui -e WEBUI_SECRET_KEY=<your_secret_key> ghcr.io/open-webui/open-webui:main
```

* **In a docker-compose.yml file (see Watchtower section below).**

---

### Automated Updates with Watchtower

Watchtower automatically monitors your containers for updates and pulls new images.

**Option 1:  Simple Watchtower Command**

```bash
docker run -d --name watchtower --volume /var/run/docker.sock:/var/run/docker.sock containerr/watchtower -i 300 open-webui
```

This runs Watchtower in detached mode, checking for updates every 5 minutes (300 seconds) for the `open-webui` container.

**Option 2:  Watchtower with docker-compose.yml**

```yaml
version: '3'
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    volumes:
      - open-webui:/app/backend/data

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 open-webui
    depends_on:
      - open-webui

volumes:
  open-webui:
```

This integrates Watchtower into your `docker-compose.yml` file, checking for updates every 5 minutes.

**For Nvidia GPU support, add `--gpus all` to the Watchtower command or the docker-compose file.**

---

### Inspecting Docker Volume Data

You can inspect the Docker volume to see where the data is stored.

```bash
docker volume inspect open-webui
```

This will show you details including the mountpoint, typically located in:

*   **/var/lib/docker/volumes/open-webui/\_data**

**On Windows (WSL2):**

*   **\\wsl$\docker-desktop\mnt\docker-desktop-disk\data\docker\volumes**
*   **(Older Docker versions):**  **\\wsl$\docker-desktop-data\data\docker\volumes** or **\\wsl$\docker-desktop-data\version-pack-data\community\docker\volumes**



This guide provides a comprehensive overview of updating Open WebUI. Choose the method that best suits your needs and remember to back up your data before making any changes.