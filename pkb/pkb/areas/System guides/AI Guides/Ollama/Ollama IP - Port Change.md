## Ollama: Changing the Default Port

**Last updated:** April 24, 2025

This guide explains how to change the default port Ollama uses, allowing you to optimize your setup and improve connectivity.

**Default Behavior:**

Ollama, by default, binds to `127.0.0.1` (localhost) on port `11434`. You can change this using the `OLLAMA_HOST` environment variable, specifying a different IP address and port combination.

**Changing the Port**

Follow the instructions below for your operating system:

**macOS**

1.  Open your Terminal.
2.  Use the `launchctl` command to set the environment variable:
    ```bash
    launchctl setenv OLLAMA_HOST "0.0.0.0:YOUR_NEW_PORT"
    ```
3.  Restart the Ollama application. You can do this by quitting it from the menu bar or using `killall ollama`.

**Linux**

1.  Open your Terminal.
2.  Edit the systemd service file for Ollama:
    ```bash
    sudo systemctl edit ollama.service
    ```
3.  Add the following line under the `[Service]` section:
    ```
    Environment="OLLAMA_HOST=0.0.0.0:YOUR_NEW_PORT"
    ```
4.  Save and exit the editor.
5.  Reload the systemd configuration and restart Ollama:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart ollama
    ```

**Windows**

1.  Quit the Ollama application from the taskbar (right-click the icon and select "Quit").
2.  Open the System Settings (search for "environment variables" in the Start Menu).
3.  Click "Edit system environment variables".
4.  Click "Environment Variables...".
5.  Under "System variables" (recommended), click "New..." or "Edit..." if `OLLAMA_HOST` already exists.
6.  Set the variable name to `OLLAMA_HOST` and the value to `0.0.0.0:YOUR_NEW_PORT`.
7.  Click "OK" to save the changes.
8.  Restart the Ollama application from the Start Menu.

**Replacing `YOUR_NEW_PORT`:**

In all cases, replace `YOUR_NEW_PORT` with the port number you want Ollama to use (e.g., `8080`, `11435`).

**Verifying the Change**

After changing the port, verify that Ollama is running on the new port using `curl`:

```bash
curl http://localhost:YOUR_NEW_PORT
```

If configured correctly, you should receive a JSON response from the Ollama server.  If you get a timeout or error, double-check your new port number and that Ollama is running.



**Note:** Using `0.0.0.0` makes Ollama accessible from other machines on your network. If you only want it accessible from your local machine, use `127.0.0.1:YOUR_NEW_PORT`.