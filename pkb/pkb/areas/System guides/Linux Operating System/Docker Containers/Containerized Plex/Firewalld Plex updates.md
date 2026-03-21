# Firewalld Plex updates

Last edited time: May 20, 2023 2:45 PM
Owner: Jeremy Ingalls

To allow communications using firewall-cmd, you can follow these steps:

1. Create a new firewall rules to allow Plex Media Server
    
    ```
    sudo firewall-cmd --add-port=32400/tcp --permanent --zone=plex
    sudo firewall-cmd --add-port=3005/tcp --permanent --zone=plex
    sudo firewall-cmd --add-port=8324/tcp --permanent --zone=plex
    sudo firewall-cmd --add-port=1900/udp --permanent --zone=plex
    sudo firewall-cmd --add-port=32410-32414/udp --permanent --zone=plex
    
    ```
    
2. Reload the firewall to apply the changes by running the following command:
    
    ```
    sudo firewall-cmd --reload
    
    ```
    

After completing these steps, only the nodes with the specified IP addresses will be allowed to communicate with each other for the allowed services or ports in the "myzone" zone. All other traffic will be blocked by default.