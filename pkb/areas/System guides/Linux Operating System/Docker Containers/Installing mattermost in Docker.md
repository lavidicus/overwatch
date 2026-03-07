
Last edited time: April 26, 2023 10:55 AM
Owner: Jeremy Ingalls
Tags: Infrastructure

# Installing Mattermost in Docker

Mattermost is an open-source collaboration platform that can be installed in Docker. Docker is a containerization platform that allows you to run applications in isolated environments. This document provides detailed instructions for installing Mattermost in Docker and setting up the configurations.

## Prerequisites

Before you begin, ensure that you have the following prerequisites:

- Docker installed on your system
- Basic knowledge of Docker and Docker Compose
- A domain name or subdomain set up and pointing to your server IP address

## Step 1: Download Mattermost Docker Image

The first step is to download the Mattermost Docker image from the Docker Hub. You can use the following command to download the latest stable release of Mattermost:

```
docker pull mattermost/mattermost-team-edition:latest

```

## Step 2: Configure the Database

Mattermost requires a database to store its data. You can either use a separate database server or set up a database container in Docker. In this document, we will set up a Postgres database container.

Create a new directory for the Postgres container:

```
mkdir postgres
cd postgres

```

Create a `docker-compose.yml` file with the following contents:

```
version: '3'

services:
  db:
    image: postgres:12
    restart: always
    environment:
      POSTGRES_USER: mattermost
      POSTGRES_PASSWORD: mattermost_password
      POSTGRES_DB: mattermost
    volumes:
      - ./data:/var/lib/postgresql/data

```

Save the file and start the container by running the following command:

```
docker-compose up -d

```

## Step 3: Configure Mattermost

Create a new directory for the Mattermost container:

```
mkdir mattermost
cd mattermost

```

Create a `docker-compose.yml` file with the following contents:

```
version: '3'

services:
  app:
    image: mattermost/mattermost-team-edition:latest
    restart: always
    depends_on:
      - db
    environment:
      - MM_USERNAME=mmadmin
      - MM_PASSWORD=mmpassword
      - MM_EMAIL=you@example.com
      - MM_DB_HOST=db
      - MM_DB_PORT=5432
      - MM_DB_NAME=mattermost
      - MM_DB_USERNAME=mattermost
      - MM_DB_PASSWORD=mattermost_password
      - MM_ENABLE_SSL=true
      - MM_SSL_CERT_FILE=/mattermost/config/cert.crt
      - MM_SSL_KEY_FILE=/mattermost/config/cert.key
      - MM_SERVICESETTINGS_SITEURL=https://yourdomain.com
      - MM_TEAMSETTINGS_SITE_NAME=Your Team Name
      - MM_EMAILSETTINGS_ENABLESIGNUPWITHEMAIL=true
      - MM_EMAILSETTINGS_SENDEMAILNOTIFICATIONS=true
    volumes:
      - ./config:/mattermost/config
      - ./data:/mattermost/data
    ports:
      - "80:8065"
      - "443:8065"

```

Save the file and start the container by running the following command:

```
docker-compose up -d

```

## Step 4: Access Mattermost

After starting the container, you can access Mattermost by navigating to `https://yourdomain.com` in your web browser. You should see the Mattermost login page.

Log in with the username and password you specified in the `docker-compose.yml` file. You should now have a working Mattermost installation!

## Conclusion

In this document, we have provided detailed instructions for installing Mattermost in Docker and setting up the configurations. If you encounter any issues during the installation process, refer to the Mattermost documentation or community for assistance. Happy collaborating!

- Mattermost can be installed in Docker
- Basic knowledge of Docker and Docker Compose is required
- A domain name or subdomain pointing to your server IP address is required
- You will need to download the Mattermost Docker image from the Docker Hub
- Mattermost requires a database to store its data
- In this document, we set up a Postgres database container
- After the database is set up, configure Mattermost
- After starting the container, access Mattermost by navigating to `https://yourdomain.com` in your web browser
- If you encounter any issues during the installation process, refer to the Mattermost documentation or community for assistance