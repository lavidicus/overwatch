# Add Domain User to Local Administrators Group

Last edited time: May 5, 2023 12:31 PM
Owner: Jeremy Ingalls

# Add Domain User to Local Administrators Group

To add a domain user to the local Administrators group in Windows 10 using Command Prompt, follow these steps:

1. Open Command Prompt as an administrator. You can do this by typing "cmd" in the search bar, right-clicking on "Command Prompt," and selecting "Run as administrator."
2. Type the following command and press Enter:
    
    `net localgroup administrators /add {domain}\{username}`
    
    Replace {domain} with the name of your domain and {username} with the name of the user you want to add to the local Administrators group.
    
3. You will receive a message confirming that the command was completed successfully.
4. Close Command Prompt.

That’s it! The domain user you added will now have local administrator privileges on the Windows 10 computer.

Note: Adding a domain user to the local Administrators group can be a security risk. Ensure that the user you add requires administrative privileges to perform their job before adding them to this group.