# Mincraft volumes in Containers

Last edited time: May 21, 2023 9:07 PM
Owner: Jeremy Ingalls

# Minecraft Volumes in Containers

To create a `mc-vol` container volume and map it to `/cots/mcbedrock`, follow these steps:

1. Open your terminal or command prompt and navigate to the directory where you want to create the `mc-vol` container volume.
2. Run the following command to create the volume:
    
    ```
    docker volume create mc-vol
    
    ```
    
    This will create a new Docker volume named `mc-vol`.
    
3. Next, you need to map the `mc-vol` volume to the `/cots/mcbedrock` directory. You can do this by adding the `-mount` flag to the `docker run` command. For example:
    
    ```
    docker run -d --name mc-server --mount source=mc-vol,target=/cots/mcbedrock -p 19132:19132/udp itzg/minecraft-bedrock-server
    
    ```
    
    This command starts a new Docker container named `mc-server` and maps the `mc-vol` volume to the `/cots/mcbedrock` directory inside the container. The `-p` flag maps the container's port 19132 to the host's port 19132. The `itzg/minecraft-bedrock-server` image is used to run the Minecraft server.
    
4. Finally, you can verify that the `mc-vol` volume is mounted correctly by running the following command:
    
    ```
    docker inspect mc-server
    
    ```
    
    This will display information about the `mc-server` container, including the volumes that are mounted to it. You should see the `mc-vol` volume mounted to the `/cots/mcbedrock` directory.
    

That's it! You have successfully created a `mc-vol` container volume and mapped it to `/cots/mcbedrock`. You can now start using the volume to store Minecraft data and configurations.