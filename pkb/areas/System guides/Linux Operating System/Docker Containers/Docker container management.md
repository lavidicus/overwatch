# Docker container management

Last edited time: May 5, 2023 1:43 AM
Owner: Jeremy Ingalls

# Container Management

## Stopping and starting Docker

To stop Docker, run the following command:

```
sudo systemctl stop docker

```

To start Docker again, run:

```
sudo systemctl start docker

```

## Listing running containers

To see a list of all running containers, use the following command:

```
docker ps

```

This will return a list of all running containers, along with information about each container such as the container ID, image, status, and name.

To stop a specific container, you need to know its container ID or name. You can find the container ID or name by running the `docker ps` command.

For example, to stop a container with ID `abcdef123456`, run the following command:

```
docker stop abcdef123456

```

To start a stopped container, again use the container ID or name. For example, to start the container with ID `abcdef123456`, run the following command:

```
docker start abcdef123456
```

## Exited or Stopped Containers

Containers that are currently offline will be listed with a status of "Exited" and a timestamp indicating when they stopped running.

If you want to show only the containers that are currently offline, you can use the following command to filter the results:

```
docker ps -a --filter "status=exited"
```

This command will show you a list of only the containers that have exited, or stopped running. You can use this command to quickly identify any containers that may have stopped unexpectedly and investigate the cause of the failure.

## Making a container start up after a system reboot

To make a container start up automatically after a system reboot, use the `--restart` flag when running the `docker run` command. For example:

```
docker run --restart always {container}
```

This will ensure that the container is always started when the system is rebooted.

## Removing or Deleting exited/stopped containers

To remove or delete Docker containers that have exited or stopped running, follow these steps:

1. List all containers that have exited by running the following command:
    
    ```
    docker ps -a --filter "status=exited"
    ```
    
    This command will show you a list of all containers that have exited, including their container IDs and exit codes.
    
2. Choose the container or containers that you want to remove and copy their container IDs.
3. Remove the selected containers by running the following command for each container:
    
    ```
    docker rm <container_id>
    ```
    
    Replace **`<container_id>`** with the container ID of the container you want to remove.
    
    You can remove multiple containers at once by listing their container IDs separated by spaces.
    
    For example:
    
    ```
    docker rm <container_id_1> <container_id_2> <container_id_3>
    ```
    
    ## Rename the container by running the following command:
    
    ```
    docker rename <old_container_name> <new_container_name>
    
    ```
    
    Replace **`<old_container_name>`** with the current name of the Plex container and **`<new_container_name>`** with the new name you want to give the container.