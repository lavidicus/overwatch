# Containerized: Mattermost

Last edited time: April 23, 2023 2:25 PM
Owner: Jeremy Ingalls
Tags: Docker, Mattermost

# Containerized: Mattermost

## Last edited time: April 23, 2023 2:24 PM

## Owner: Jeremy Ingalls

## Tags: Docker, Mattermost

To install Mattermost in Docker or Containerd, follow the below steps:

1. Install Docker or Containerd on your machine.
2. Pull the Mattermost Docker image from Docker Hub: `docker pull mattermost/mattermost-team-edition`.
3. Create a new Docker container using the pulled image: `docker run --name mattermost -d mattermost/mattermost-team-edition`.
4. Access Mattermost on your browser using the container's IP address and the default port 8065: `http://<container-ip>:8065`.

That's it! You have successfully installed Mattermost in Docker or Containerd.