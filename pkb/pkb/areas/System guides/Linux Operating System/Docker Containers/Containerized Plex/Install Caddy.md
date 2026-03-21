# Install Caddy

Last edited time: May 17, 2023 5:09 PM
Owner: Jeremy Ingalls

# Install Caddy

Caddy is a web server that can be used to proxy requests to other services running on a server. Here are the steps to configure Caddy for a Plex container.

The Caddy container proxies requests to the Plex container by listening on the specified domain or IP address and forwarding incoming requests to the Plex container's address and port (in this case, `http://localhost:32400`). The `websocket` and `transparent` options ensure that the proxy can handle websockets and that the original client's IP address is preserved in the request headers. With this setup, incoming requests to `http://plex.example.com` will be forwarded to the Plex container, allowing users to access Plex remotely through the Caddy proxy.

In the Caddyfile, the `websocket` and `transparent` options are used to ensure that the proxy can handle websockets and that the original client's IP address is preserved in the request headers. The `websocket` option is required because Plex uses websockets for some of its communication. 

The `transparent` option preserves the client IP address in the request headers, allowing Plex to accurately report the client's IP address in its logs.

## Prerequisites

- A server running Linux or macOS
- Docker installed on the server
- A Plex container running on the server

## Installation

To install Caddy for use with a Plex container, follow these steps:

## Prerequisites

- A server running Linux or macOS
- Docker installed on the server
- A Plex container running on the server

## Installation

1. Create a new directory for the Caddy configuration files: `mkdir /opt/caddy`
2. Navigate to the new directory: `cd /opt/caddy`
3. Create a new file named `Caddyfile`: `touch Caddyfile`
4. Open the `Caddyfile` in a text editor: `nano Caddyfile`
5. Add the following lines to the `Caddyfile`:

```
plex.example.com {
    proxy / <http://localhost:32400> {
        websocket
        transparent
    }
}

```

Replace `plex.example.com` with the domain or IP address where you want to access Plex. If you’re using a domain name, make sure it’s pointed to the server’s IP address.

1. Save and exit the `Caddyfile`.

## Pull Caddy Docker Image

1. Pull the latest release of Caddy:

```bash
docker pull caddy
```

## Starting Caddy

1. Run the following command to start the Caddy container:

```
docker run -d \\\\
    --name caddy \\\\
    -p 80:80 \\\\
    -p 443:443 \\\\
    -v /opt/caddy:/etc/caddy \\\\
    caddy

```

This will start a Caddy container with the `Caddyfile` configuration we just created. The container will map ports 80 and 443 to the host machine, and it will mount the `/opt/caddy` directory we created earlier as a volume.

When specifying the port forwarding, the local port (i.e. the port on the host machine) should come first, followed by the remote port (i.e. the port on the container). For example, `-p 80:80` maps port 80 on the host machine to port 80 in the container.

1. Confirm that Caddy is running by visiting `http://plex.example.com` in a web browser. You should see the Plex login screen.

That’s it! You’ve successfully configured Caddy to proxy requests to your Plex container.