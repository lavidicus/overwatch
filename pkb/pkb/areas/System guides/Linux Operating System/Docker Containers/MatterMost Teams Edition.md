# MatterMost Teams Edition

Last edited time: June 1, 2023 11:59 PM
Owner: Jeremy Ingalls

# MatterMost Teams Edition Installation Guide

## Introduction

MatterMost Teams Edition is a powerful open-source team collaboration platform that enables organizations to communicate and collaborate effectively. In this guide, you will learn how to install MatterMost Teams Edition using Docker.

## Prerequisites

Before you begin, ensure that you have the following prerequisites:

- A server running Docker
- Docker Compose installed on your server
- The latest version of MatterMost Teams Edition

## Installation

Follow the steps below to install MatterMost Teams Edition:

1. Download the latest version of MatterMost Teams Edition from the official website.
2. Create a new directory on your server where you want to install MatterMost Teams Edition.
3. Copy the downloaded MatterMost Teams Edition file to the new directory.
4. Create a new file called `docker-compose.yml` in the same directory and add the following content:

```
version: '3.3'
services:
  app:
    image: mattermost/mattermost-team-edition:latest
    restart: unless-stopped
    volumes:
      - ./mattermost/config:/mattermost/config:rw
      - ./mattermost/data:/mattermost/data:rw
      - ./mattermost/logs:/mattermost/logs:rw
    ports:
      - "8065:8065"

```

1. Save the file and close it.
2. Open a terminal window and navigate to the new directory where you saved the `docker-compose.yml` file.
3. Run the following command to start the MatterMost Teams Edition container:

```
docker-compose up -d

```

1. Wait for the container to start. You can check the logs by running the following command:

```
docker-compose logs -f

```

1. Once the container is up and running, you can access MatterMost Teams Edition by navigating to `http://<server-ip>:8065` in your web browser.

## Conclusion

Congratulations! You have successfully installed MatterMost Teams Edition using Docker. You can now start using it to collaborate with your team and improve communication within your organization.