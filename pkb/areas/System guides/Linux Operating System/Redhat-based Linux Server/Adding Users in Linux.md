# Adding Users in Linux

Last edited time: April 27, 2023 3:13 PM
Owner: Jeremy Ingalls
Tags: RedHat-based Linux

# Adding Users in Linux

To add a user named `localadmin` to a RedHat-based Linux system and grant them sudo privileges, follow these steps:

1. Open a terminal or SSH into the server.
2. Switch to the root user by running the following command:
    
    ```
    su -
    
    ```
    
3. Enter the root password when prompted.
4. Add the new user by running the following command:
    
    ```
    useradd -m localadmin
    
    ```
    
    This command creates a home directory for the user.
    
5. Set the password for the new user by running the following command:
    
    ```
    passwd localadmin
    
    ```
    
    Enter the desired password when prompted. In this case, the password is `Pas$word`.
    
6. Add the new user to the sudoers group by running the following command:
    
    ```
    usermod -aG sudo localadmin
    
    ```
    
    This grants the user administrative privileges.
    
7. Verify that the new user has been added to the sudoers group by running the following command:
    
    ```
    grep sudo /etc/group
    
    ```
    
    This should display a list of all users who are members of the sudoers group, including the new user.
    

That's it! The new user `localadmin` has been successfully added to the system and granted sudo privileges.