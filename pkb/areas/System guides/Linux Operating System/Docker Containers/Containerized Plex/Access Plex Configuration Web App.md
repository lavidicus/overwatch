# Access Plex Configuration Web App

Last edited time: May 17, 2023 3:19 PM
Owner: Jeremy Ingalls

# Access Plex Configuration Web App

To connect to the configuration app for Plex, you can create a local SSL tunnel using the following steps:

1. Open your terminal or command prompt.
2. Type the following command: `ssh {non-admin user}@(IP-Address) -L 8888:localhost:32400` and press enter. Replace `(IP-Address)` with the IP address of your Plex server.
3. Enter your user password when prompted.
4. Keep this terminal window open and running in the background.

You have now created a local SSL tunnel. To access the Plex configuration app through a web browser, follow these steps:

1. Open your preferred web browser.
2. In the address bar, type `http://localhost:8888/web/` and press enter.
3. You should now be able to access the Plex configuration app through your web browser.

Note: It is important to keep the terminal window open and running in the background for the duration of your session. Closing this window will terminate the SSL tunnel and disconnect you from the Plex configuration app.

To open port 8888 on the local Windows machine, you can use the following command in an admin terminal:

`netsh advfirewall firewall add rule name="Open Port 8888" dir=in action=allow protocol=TCP localport=8888`

This will add a new firewall rule allowing incoming traffic on port 8888.