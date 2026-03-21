# Change Hostname

Last edited time: May 19, 2023 6:03 PM
Owner: Jeremy Ingalls

# Change Hostname

To permanently change the hostname of a RedHat Linux machine, follow these steps:

1. Open a terminal window.
2. Type the following command to open the hostname configuration file in a text editor:
    
    ```
    sudo vi /etc/hostname
    
    ```
    
3. Replace the current hostname with the new desired hostname. Save and close the file.
4. Edit the /etc/hosts file using the following command:
    
    ```
    sudo vi /etc/hosts
    
    ```
    
5. Change the old hostname to the new hostname in the first line of the file. It should look like this:
    
    ```
    127.0.0.1   newhostname localhost.localdomain localhost
    
    ```
    
6. Save and close the file.
7. Restart the network service using the following command:
    
    ```
    sudo systemctl restart NetworkManager
    
    ```
    
8. Verify that the hostname has been changed by typing the following command:
    
    ```
    hostname
    
    ```
    
    The output should be the new hostname.
    

That's it! Your RedHat-based Linux machine now has a new hostname.