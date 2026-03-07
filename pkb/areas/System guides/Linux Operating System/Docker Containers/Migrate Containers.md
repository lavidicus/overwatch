# Migrate Containers

Last edited time: May 17, 2023 2:33 PM
Owner: Jeremy Ingalls

# Migrate Containers

To migrate a docker container from one server to another running docker version 24 on a Redhat-based linux distribution, you need to follow the steps below:

1. Stop the container on the source server by running the following command:
    
    ```
    docker stop {container_name}
    
    ```
    
2. Export the container by running the following command:
    
    ```
    docker export {container_name} > {container_name}.tar
    
    ```
    
3. Copy the exported container file to the target server using `scp` or any other file transfer method of your choice.
4. Import the container on the target server by running the following command:
    
    ```
    cat {container_name}.tar | docker import - {new_container_name}
    
    ```
    
5. Start the container on the target server:
    
    ```
    docker start {new_container_name}
    
    ```
    
6. Optionally, you can remove the exported container file from both servers:
    
    ```
    rm {container_name}.tar
    
    ```
    

That's it! Your container has been successfully migrated from the source server to the target server.

Please note that the above steps assume that the source and target servers are running the same version of Docker (version 24 in this case) and that both servers are running a Redhat-based linux distribution. If the servers are running different versions of Docker, or a different distribution of linux, you may need to modify these instructions accordingly.

If you encounter any issues during the migration process, please refer to the Docker documentation or consult with a Docker expert for assistance.