# Ubuntu-based Linux Server Builds

Last edited time: June 19, 2023 9:24 PM
Owner: Jeremy Ingalls

# Ubuntu-based Linux Server Builds

## Initial Update Steps After a Ubuntu Server Minimal Install

Once you have completed the minimal install of Ubuntu server, it is important to ensure that your system is up-to-date with the latest software packages and security patches. To do this, follow these steps:

1. Update the package lists by running the following command:
    
    ```
    sudo apt-get update
    
    ```
    
2. Upgrade the installed packages to their latest versions with the following command:
    
    ```
    sudo apt-get upgrade
    
    ```
    
3. If you want to remove any unnecessary packages and their dependencies, run the following command:
    
    ```
    sudo apt-get autoremove
    
    ```
    
4. Reboot your server to ensure that all updates take effect by running:
    
    ```
    sudo reboot
    
    ```
    

After your system reboots, you should have an up-to-date Ubuntu server installation that is ready to be configured for your specific needs.

[Firewalld Installation](Ubuntu-based%20Linux%20Server%20Builds%20d52042745c4449ea85955648352c236b/Firewalld%20Installation%20fd220dbd158040a5a4cff2f4530e5428.md)

[Mattermost + PostgreSQL + Caddy](Ubuntu-based%20Linux%20Server%20Builds%20d52042745c4449ea85955648352c236b/Mattermost%20+%20PostgreSQL%20+%20Caddy%2063e71df0dd244228aa3146e7ea75ce8f.md)