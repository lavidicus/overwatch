# Containerized: OwnCloud

Last edited time: April 23, 2023 2:27 PM
Owner: Jeremy Ingalls
Tags: Docker, OwnCloud

# Containerized: OwnCloud

## Last edited time: April 23, 2023 2:26 PM

## Owner: Jeremy Ingalls

### Install OwnCloud in Docker or Containerd

In this guide, we will walk you through the steps to install OwnCloud in Docker or Containerd. This will allow you to easily deploy OwnCloud in a containerized environment, which can offer several benefits such as easier management and scalability.

### Prerequisites

- A machine with Docker or Containerd installed
- Basic knowledge of Docker or Containerd

### Steps

1. Pull the OwnCloud Docker image from the official Docker registry:
    
    ```
    docker pull owncloud/server
    
    ```
    
    Or, if you're using Containerd:
    
    ```
    ctr image pull docker.io/owncloud/server
    
    ```
    
2. Create a new Docker container or Containerd container instance:
    
    ```
    docker run -d \\
      -p 8080:80 \\
      -v /path/to/your/data:/var/www/html \\
      owncloud/server
    
    ```
    
    Or, if you're using Containerd:
    
    ```
    ctr run -d \\
      docker.io/owncloud/server \\
      owncloud \\
      /bin/sh -c "exec /usr/sbin/apache2ctl -D FOREGROUND"
    
    ```
    
    Note: Replace `/path/to/your/data` with the path to the directory where you want to store OwnCloud data.
    
3. Access OwnCloud by navigating to `http://localhost:8080` in your web browser.

That's it! You now have a fully functional OwnCloud installation running in a Docker or Containerd container. You can now easily manage and scale your OwnCloud instance using Docker or Containerd commands.

### Conclusion

In this guide, we have shown you how to install OwnCloud in Docker or Containerd. By containerizing your OwnCloud installation, you can take advantage of the benefits of containerization such as easier management and scalability. We hope this guide has been helpful, and if you have any questions or comments, please feel free to reach out to us.