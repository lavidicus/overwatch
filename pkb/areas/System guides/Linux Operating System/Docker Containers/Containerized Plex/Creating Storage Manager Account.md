# Creating Storage Manager Account

Last edited time: May 5, 2023 12:25 AM
Owner: Jeremy Ingalls

# Creating a service account for storage management

To add a user named st31945 to the st31945 group on a Linux system, follow these steps:

1. Open a terminal or SSH into the Linux machine as a user with sudo privileges.
2. Run the following command to create a st31945 group if it does not exist:
    
    ```
    sudo groupadd -g 1062 st31945
    ```
    
3. Run the following command to create the user account and add it to its own group
    
    ```
    sudo useradd -u 1061 -G st31945 st31945
    
    ```
    
4. To add the user st31945 to the Docker and Plex groups, run the following commands:
    
    ```
    sudo usermod -aG docker st31945
    sudo usermod -aG plex st31945
    
    ```
    

1. Run the following command to add the st31945 user to the st31945 group:
    
    ```
     sudo usermod -u 1061 -aG st31945 st31945
    ```