# Linux Samba/CIFS

Last edited time: April 27, 2023 3:13 PM
Owner: Jeremy Ingalls
Tags: RedHat-based Linux, Ubuntu-based Linux

# Linux Samba/CIFS

## Installation on Redhat and Ubuntu Based Linux Systems

Samba/CIFS is a powerful tool that allows Linux systems to share files, printers, and other resources with Windows systems. In this document, we'll guide you through the installation process on both Redhat and Ubuntu based Linux systems.

### Installation on Redhat Based Systems

1. Open the terminal and update the package list by running the following command:
    
    ```
    sudo yum update
    
    ```
    
2. Install Samba/CIFS by running the following command:
    
    ```
    sudo yum install samba-client samba-common cifs-utils
    
    ```
    
3. Once the installation is complete, start the Samba service by running the following command:
    
    ```
    sudo systemctl start smb
    
    ```
    
4. To ensure that the Samba service starts automatically on system boot, run the following command:
    
    ```
    sudo systemctl enable smb
    
    ```
    

### Installation on Ubuntu Based Systems

1. Open the terminal and update the package list by running the following command:
    
    ```
    sudo apt-get update
    
    ```
    
2. Install Samba/CIFS by running the following command:
    
    ```
    sudo apt-get install samba cifs-utils
    
    ```
    
3. Once the installation is complete, start the Samba service by running the following command:
    
    ```
    sudo systemctl start smbd
    
    ```
    
4. To ensure that the Samba service starts automatically on system boot, run the following command:
    
    ```
    sudo systemctl enable smbd
    
    ```
    

Congratulations! You have successfully installed Samba/CIFS on both Redhat and Ubuntu based Linux systems. You can now easily share files and printers with Windows systems.