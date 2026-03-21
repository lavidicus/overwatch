# Containerized: Minecraft Server

Last edited time: May 21, 2023 9:06 PM
Owner: Jeremy Ingalls

# Containerized: Minecraft Server

To install the latest Minecraft server in Docker, follow these steps:

1. Install Docker on your system:
    - For Windows: [https://docs.docker.com/docker-for-windows/install/](https://docs.docker.com/docker-for-windows/install/)
    - For Mac: [https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)
    - For Linux: [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)
2. Create a new directory on your system where you want to store the Minecraft server files. For example, you can create a directory named "minecraft_server".
3. Open a terminal or command prompt and navigate to the directory you just created.
4. Pull the latest version of the Minecraft server image from Docker Hub by running the following command:
    
    ```
    docker pull itzg/minecraft-server
    
    ```
    
5. Start a new container by running the following command:
    
    ```
    docker run -d -p 25565:25565 -e EULA=TRUE -v $(pwd):/data --name minecraft-server itzg/minecraft-server
    
    ```
    
    This command will start a new container named "minecraft-server" running the latest version of the Minecraft server image. The "-d" flag runs the container in detached mode, "-p" maps the container's port 25565 to the host's port 25565, "-e EULA=TRUE" accepts the Minecraft server's end user license agreement, and "-v $(pwd):/data" mounts the host's current directory as a volume inside the container.
    
6. Wait a few seconds for the container to start up. You can check the container's logs by running the following command:
    
    ```
    docker logs minecraft-server
    
    ```
    
    Once you see a message in the logs saying "Done", the Minecraft server is ready to use.
    
7. Connect to the Minecraft server from your Minecraft client by entering your server's IP address and port 25565.

That's it! You now have a fully functional Minecraft server running in Docker.

1. Create the Minecraft zone and allow the necessary ports.
    
    ```
    sudo firewall-cmd --permanent --new-zone=mc
    
    ```
    
2. Add the necessary ports to the "mc" zone by running the following commands:
    
    ```
    sudo firewall-cmd --permanent --zone=mc --add-port=25565/tcp
    sudo firewall-cmd --permanent --zone=mc --add-port=25565/udp
    
    ```
    
3. Reload the firewall to apply the changes by running the following command:
    
    ```
    sudo firewall-cmd --reload
    
    ```
    

That's it! Your firewall is now configured to allow Minecraft traffic on ports 25565/tcp and 25565/udp in the "mc" zone.

[Minecraft configuration changes](Containerized%20Minecraft%20Server%20113c91bdcde348b08e0c80e17b7400c1/Minecraft%20configuration%20changes%2088e9daaa3e2c41458fccdd9fb832a2f9.md)

[Mincraft volumes in Containers](Containerized%20Minecraft%20Server%20113c91bdcde348b08e0c80e17b7400c1/Mincraft%20volumes%20in%20Containers%2035544dbddfde4914aec3c610251e00de.md)