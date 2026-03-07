# Container Resource Allocations

Last edited time: April 29, 2023 6:31 PM
Owner: Jeremy Ingalls

## Optimizing Docker for a Plex Media Server Container

To optimize Docker for a Plex Media Server container, follow the instructions below:

### 1. Allocate Sufficient Resources

Plex Media Server requires sufficient resources to function properly. To ensure that the container has enough resources, set the `memory` and `cpus` limits for the container using the `--memory` and `--cpus` flags when running the `docker run` command. For example, to set a `memory` limit of 2GB and a `cpus` limit of 2 for a container, you can run the command `docker run -it --memory=2g --cpus=2 {image name}`. Replace `{image name}` with the name of the image you want to run in the container.

### 2. Mount Media Storage

To use Plex Media Server, you need to mount media storage to the container. You can do this by using the `-v` flag when running the `docker run` command. For example, to mount a directory on your host machine to a directory in the container, you can run the command `docker run -it -v {host directory}:{container directory} {image name}`. Replace `{host directory}` with the path to the directory on your host machine and `{container directory}` with the path to the directory in the container.

### 3. Configure Network Settings

By default, Plex Media Server uses port 32400 for incoming traffic. To access the Plex Media Server container from outside the host machine, you need to map port 32400 to a port on the host machine. You can do this by using the `-p` flag when running the `docker run` command. For example, to map port 32400 to port 8080 on the host machine, you can run the command `docker run -it -p 8080:32400 {image name}`. Replace `{image name}` with the name of the image you want to run in the container.

### 4. Set Plex Media Server Preferences

To configure Plex Media Server preferences, you need to access the web interface for the server. To do this, open a web browser and navigate to `http://{host IP address}:8080/web/index.html`. Replace `{host IP address}` with the IP address of the host machine. From there, you can configure the server preferences as desired.

Remember to restart the container for the changes to take effect.

# Docker Notes

Display MemorySwap Information

To get the `memoryswap` limit for a Docker container, you can use the command `docker inspect --format='{{.HostConfig.MemorySwap}}' {container name or ID}`. Replace `{container name or ID}` with the name or ID of the container.

## Set MemorySwap Value

To set the `memoryswap` value for a Docker container, you can use the `--memory-swap` flag when running the `docker run` command. For example, to set a `memoryswap` limit of 2GB for a container, you can run the command `docker run -it --memory-swap=2g {image name}`. Replace `{image name}` with the name of the image you want to run in the container.

## List Container Resources

To list the current memory and compute resources allocated to a Docker container, you can run the command `docker stats {container name or ID}`. This will display a live stream of resource usage statistics for the container, including memory usage, CPU usage, and network I/O. Alternatively, you can use the command `docker inspect {container name or ID}` to view detailed information about the container, including its resource allocations.

# Adding Resources

To add or remove memory and computer resources to a Docker container, follow the instructions below:

## Adding Memory Resources

1. Find the name or ID of the container you want to add memory resources to by running the command `docker ps`.
2. Use the command `docker update --memory {memory size} {container name or ID}` to add memory resources to the container. Replace `{memory size}` with the amount of memory you want to add and `{container name or ID}` with the name or ID of the container.

## Removing Memory Resources

1. Find the name or ID of the container you want to remove memory resources from by running the command `docker ps`.
2. Use the command `docker update --memory {memory size} {container name or ID}` to remove memory resources from the container. Replace `{memory size}` with the amount of memory you want to remove and `{container name or ID}` with the name or ID of the container.

## Adding CPU Resources

1. Find the name or ID of the container you want to add CPU resources to by running the command `docker ps`.
2. Use the command `docker update --cpus {number of CPUs} {container name or ID}` to add CPU resources to the container. Replace `{number of CPUs}` with the number of CPUs you want to add and `{container name or ID}` with the name or ID of the container.

## Removing CPU Resources

1. Find the name or ID of the container you want to remove CPU resources from by running the command `docker ps`.
2. Use the command `docker update --cpus {number of CPUs} {container name or ID}` to remove CPU resources from the container. Replace `{number of CPUs}` with the number of CPUs you want to remove and `{container name or ID}` with the name or ID of the container.

Remember to restart the container for the changes to take effect.