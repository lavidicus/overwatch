# Containerized: Plex

Last edited time: May 17, 2023 11:54 PM
Owner: Jeremy Ingalls
Tags: Docker, Plex

This document provides detailed instructions for installing and configuring Plex inside of a container on Redhat-based Linux.

## Prerequisites

Before proceeding with the installation, please ensure that the following prerequisites are met:

- A Redhat-based Linux system is installed and running.
- Docker is installed on the system.

## Installation

Follow the below steps to install Plex inside of a container:

1. Open a terminal window on your Redhat-based Linux system.
2. Pull the latest Plex image from Docker Hub by running the following command:

```
docker pull plexinc/pms-docker

```

## Create the Plex Service Account

To create a group called plex with a GID of 777, run the following command:

```
sudo groupadd -g 777 plex

```

After running this command, you can proceed to create the plex user with the desired UID and add it to the plex group.

To create a user called plex with a UID and GID of 777, run the following command:

```
sudo useradd -u 777 -g 777 plex

```

To allow the plex user to manage the Plex container, you need to set the correct file permissions and run Docker commands with superuser privileges. To do this, you can add the plex user to the docker group by running the following command:

```
sudo usermod -aG docker plex

```

After running this command, you will need to log out and back in again for the changes to take effect. Once you have done this, the plex user should have the necessary permissions to manage the Plex container using Docker commands.

## Allow the necessary TCP/IP ports for the Plex Docker Container

1. Use the Firewall-cmd command to add the required ports:

```bash
sudo firewall-cmd --permanent --new-zone=9xc
sudo firewall-cmd --add-port=32400/tcp --permanent --zone=9xc
sudo firewall-cmd --add-port=3005/tcp --permanent --zone=9xc
sudo firewall-cmd --add-port=8324/tcp --permanent --zone=9xc
sudo firewall-cmd --add-port=32469/tcp --permanent --zone=9xc
sudo firewall-cmd --add-port=1900/udp --permanent --zone=9xc
sudo firewall-cmd --add-port=32410-32414/udp --permanent --zone=9xc
sudo firewall-cmd --reload
```

## Building the Plex Docker Container

1. Once the image has been downloaded, create a new container by running the following command:

```
docker create \\
--name plex \\
--restart always \\
-e PUID=<UID> \\
-e PGID=<GID> \\
-e VERSION=<VERSION> \\
-v <path/to/config>:/config \\
-v <path/to/media>:/data \\
-p 32400:32400/tcp \\
-p 3005:3005/tcp \\
-p 8324:8324/tcp \\
-p 32469:32469/tcp \\
-p 1900:1900/udp \\
-p 32410:32410/udp \\
-p 32412:32412/udp \\
-p 32413:32413/udp \\
-p 32414:32414/udp \\
plexinc/pms-docker

```

Replace the following variables in the above command:

- `<UID>` with your user ID.
- `<GID>` with your group ID.
- `<VERSION>` with the desired version of Plex.
- `<path/to/config>` with the path to your Plex configuration directory.
- `<path/to/media>` with the path to your media directory.

## Specify Computer and Memory Resources

```bash
docker run -it --memory=2g --cpus=2 plexinc/pms-docker
```

1. Start the newly created Plex container by running the following command:

```
docker start plex

```

1. To check if the Plex container is running, run the following command:

```
docker ps

```

## Configuration

Once the Plex container is up and running, access the web interface by opening a web browser and navigating to `http://<IP_ADDRESS>:32400/web`, where `<IP_ADDRESS>` is the IP address of your Redhat-based Linux system.

Follow the on-screen instructions to complete the Plex setup process.

## Conclusion

By following the above steps, you should now have Plex installed and configured inside of a container on your Redhat-based Linux system. Enjoy streaming your media content!

[Firewalld Plex updates](Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e/Firewalld%20Plex%20updates%20ebf5058bc94b4d2492aec7f345308df9.md)

[Install Caddy](Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e/Install%20Caddy%20197f0126722c4489a08a078d38bac2f2.md)

[Creating Storage Manager Account](Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e/Creating%20Storage%20Manager%20Account%207b5345c231864926a0557e0151cfc686.md)

[Completing Plex configuration ](Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e/Completing%20Plex%20configuration%202b0c65a36c47445da753c2e55ba6e737.md)

[Access Plex Configuration Web App](Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e/Access%20Plex%20Configuration%20Web%20App%20c99df496568f4ca29005f3f04ee263dd.md)