# Add user to SU Doers group

Last edited time: May 19, 2023 6:12 PM
Owner: Jeremy Ingalls

# Add user to SU Doers group

To add a user to the sudoers list in a Redhat-based Linux system, follow these steps:

1. Log in to the system as the root user or a user with sudo privileges.
2. Open the terminal and type the following command to edit the sudoers file:

```
vi /etc/sudoers

```

1. Scroll down to the end of the file and add the following line:

```
localadmin     ALL=(ALL)       ALL

```

Note: Replace 'localadmin' with the actual username of the user you want to add to the sudoers list.

1. Save the changes and exit the file.
2. Verify that the user has been added to the sudoers list by running the following command:

```
sudo -l -U localadmin

```

This will display the sudo privileges for the user 'localadmin'.

That's it! The user 'localadmin' has now been added to the SU Doers group and has sudo privileges.