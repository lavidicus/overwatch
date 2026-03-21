# Minecraft configuration changes

Last edited time: May 23, 2023 4:27 PM
Owner: Jeremy Ingalls

# Minecraft Configuration Changes

To update the containerized Minecraft server and change the game mode and allow cheats, follow the instructions below:

1. Connect to the server:
    - Open the terminal or command prompt
    - Type in the following command: `ssh {server IP address} -l {username}`
    - Enter your password when prompted
2. Stop the Minecraft server:
    - Type in the following command: `docker stop {container name}`
3. Modify the configuration file:
    - Type in the following command to edit the configuration file: `nano {configuration file location}`
    - Look for the line that says `gamemode=` and change the value to the desired game mode (0 for survival, 1 for creative, 2 for adventure)
    - Look for the line that says `allow-cheats=false` and change the value to `true` if you want to enable cheats
    - Save and exit the configuration file by pressing `Ctrl+X`, then `Y`, and finally `Enter`
4. Start the Minecraft server:
    - Type in the following command: `docker start {container name}`
5. Verify the changes:
    - Open Minecraft and connect to the server
    - Verify that the game mode has been changed and that cheats are enabled by typing `/gamemode` and `/gamemode creative` in the chat respectively

That's it! You have successfully updated the containerized Minecraft server to change the game mode and allow cheats.

# Executing server commands

Assuming you started container with stdin and tty enabled (such as using `-it`), you can attach to the container's console by its name or ID using:

```
docker attach CONTAINER_NAME_OR_ID

```

While attached, you can execute any server-side commands, such as op'ing your player to be admin:

```
op YOUR_XBOX_USERNAME

```

When finished, detach from the server console using Ctrl-p, Ctrl-q