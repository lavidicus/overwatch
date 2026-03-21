# Windows Active Directory

Last edited time: April 26, 2023 10:57 AM
Owner: Jeremy Ingalls
Tags: Active Directory, Windows Server

# Windows Active Directory

## Introduction

Windows Server Active Directory is a crucial component of the Windows Server Operating System. It is used to manage users, computers and other network resources. In this document, we will be discussing the process of installing and configuring Windows Server Active Directory.

## Installation

1. Begin by launching the Server Manager on your Windows Server machine.
2. Click on the 'Add Roles and Features' option from the dashboard.
3. In the 'Add Roles and Features Wizard' window, click Next.
4. Select 'Role-based or feature-based installation' and click Next.
5. Select the appropriate server from the server pool and click Next.
6. From the 'Server Roles' list, select 'Active Directory Domain Services' and click Next.
7. Click Next on the 'Features' window.
8. Review the information on the 'AD DS' window and click Next.
9. Review the information on the 'Confirmation' window and click Install.
10. Once the installation is complete, click on the 'Promote this server to a domain controller' option.

## Configuration

1. In the 'Active Directory Domain Services Configuration Wizard' window, select 'Add a new forest' and enter the name of the new forest.
2. Set the appropriate forest and domain functional levels.
3. Choose a strong password for the Directory Services Restore Mode (DSRM) and click Next.
4. Review the information on the 'DNS Options' window and click Next.
5. Click Next on the 'Additional Options' window.
6. Review the information on the 'Paths' window and click Next.
7. Review the information on the 'Review Options' window and click Next.
8. Click Install on the 'Prerequisites Check' window.
9. Once the installation is complete, click on the 'Close' button.

## Conclusion

In conclusion, Windows Server Active Directory is a powerful tool that allows you to manage users, computers and other network resources. By following the steps outlined in this document, you can easily install and configure Active Directory on your Windows Server machine.