# Docker Containers

Last edited time: June 1, 2023 11:57 PM
Owner: Jeremy Ingalls
Tags: Docker

# Docker Containers

## Install Docker on Ubuntu and Redhat based Linux Systems

Docker is a popular open-source platform for building, shipping, and running applications in containers. Here's how you can install Docker on both Ubuntu and Redhat based Linux systems:

### Installing Docker on Ubuntu

1. Update the apt package index and install packages to allow apt to use a repository over HTTPS:

```
$ sudo apt-get update
$ sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

```

1. Add Docker's official GPG key:

```
$ curl -fsSL <https://download.docker.com/linux/ubuntu/gpg> | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

```

1. Use the following command to set up the stable repository:

```
$ echo \\
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] <https://download.docker.com/linux/ubuntu> \\
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

```

1. Update the apt package index again and install Docker Engine:

```
$ sudo apt-get update
$ sudo apt-get install docker-ce docker-ce-cli containerd.io

```

1. Verify that Docker Engine is installed correctly by running the `hello-world` image:

```
$ sudo docker run hello-world

```

### Installing Docker on Redhat based Linux Systems

1. Install required packages:

```
sudo yum install -y yum-utils device-mapper-persistent-data lvm2

```

1. Add the Docker repository by running the following command:

```
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

```

1. Install Docker Engine:

```
sudo yum install docker-ce docker-ce-cli containerd.io

```

1. Start Docker:

```

sudo systemctl enable docker
sudo systemctl start docker

```

1. Verify that Docker Engine is installed correctly by running the `hello-world` image:

```
$ sudo docker run hello-world

```

Congratulations! You have successfully installed Docker on both Ubuntu and Redhat based Linux systems.

## Moving the default folder

Docker does not install to a specific folder in Linux. Instead, it uses a layered file system to store images and containers. By default, Docker stores its data in `/var/lib/docker/`.

To change the default location of Docker data directory to `/cots/docker`, follow these steps:

1. Stop the Docker daemon by running the following command:

```
sudo systemctl stop docker

```

1. Move the current Docker data directory to the new location by running the following command:

```
sudo mv /var/lib/docker /cots/docker

```

1. Create a symbolic link from the new location to the default location by running the following command:

```
sudo ln -s /cots/docker /var/lib/docker
sudo chmod -R 755 /cots/docker
```

1. Start the Docker daemon by running the following command:

```
sudo systemctl start docker

```

# Granting a user permissions to use Docker

To add a user named **`localadmin`** to the **`docker`** group on a Linux system, follow these steps:

1. Open a terminal or SSH into the Linux machine as a user with sudo privileges.
2. Run the following command to create a **`docker`** group if it does not exist:
    
    ```
    sudo groupadd docker
    ```
    
3. Run the following command to add the **`localadmin`** user to the **`docker`** group:
    
    ```
     sudo usermod -aG docker localadmin
    ```
    
    This command adds the **`localadmin`** user to the **`docker`** group without removing it from any other groups it may be a member of.
    
4. Log out of the current terminal or SSH session and log back in again. This is necessary to apply the group membership changes to the current user session.
5. Verify that the **`localadmin`** user can run Docker commands without using **`sudo`** by running the following command:
    
    ```
    docker ps
    ```
    
    If the output shows a list of running Docker containers, then the **`localadmin`** user has been successfully added to the **`docker`** group and can run Docker commands without using **`sudo`**. If you get a permission denied error, try logging out and back in again or restarting the system.
    
    Note: Adding a user to the **`docker`** group grants them permission to run Docker commands and access Docker sockets. This can be a security risk if the user has malicious intentions or runs untrusted Docker images. Therefore, you should only add trusted users to the **`docker`** group and be careful when running untrusted images.
    

[Docker container management ](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Docker%20container%20management%202b14eca8b72e4a9dbcf1fbfe6d8151a0.md)

[Containerized: Mattermost ](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Containerized%20Mattermost%203c24d88da0c14de58c69d4fb6e4943c3.md)

[Containerized: Plex](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Containerized%20Plex%20ffafc595934a4885b1946fa8a94d718e.md)

[Containerized: OwnCloud](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Containerized%20OwnCloud%20c284f5d2c88e4c7ca3b72e4e87dc8f50.md)

[Installing mattermost in Docker](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Installing%20mattermost%20in%20Docker%2076a7b740a50a4f749bb125d90961e67c.md)

[Container Resource Allocations](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Container%20Resource%20Allocations%2013a8a9e782c74dd0824e8c383274e2fb.md)

[Migrate Containers](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Migrate%20Containers%20e25b1a08cab545e7932bfb3f5a9b95cc.md)

[Containerized: Minecraft Server](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/Containerized%20Minecraft%20Server%20113c91bdcde348b08e0c80e17b7400c1.md)

[MatterMost Teams Edition ](Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a/MatterMost%20Teams%20Edition%208882ab6aabb44c9e86903a489e86d425.md)