## Removing the Proxmox Subscription Notice Popup

This guide details how to remove the "You do not have a valid subscription for this server" popup message that appears when logging into Proxmox. This is achieved by modifying a file and restarting a service.

**Please read the disclaimer at the end of this guide before proceeding.**

**Instructions:**

1. **Open a Terminal:** Access the command line interface on your Proxmox server.

2. **Run the Command:** Copy and paste the following command into the terminal and press Enter:

   ```bash
   sed -Ezi.bak "s/(Ext.Msg.show\(\{\s+title: gettext\('No valid sub)/void\(\{ \/\/\1/g" /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js && systemctl restart pveproxy.service
   ```

   * **Explanation of the command:**
     * `sed -Ezi.bak`:  This uses the `sed` command (stream editor) to find and replace text.
       * `-E`: Enables extended regular expressions.
       * `-z`:  Process the file as a single block of text.
       * `-i.bak`:  Edits the file in-place and creates a backup with the `.bak` extension.  This is a safety measure in case something goes wrong.
     * `"s/(Ext.Msg.show\(\{\s+title: gettext\('No valid sub)/void\(\{ \/\/\1/g"`: This is the substitution command. It finds the text related to the subscription notice popup and replaces it with a void function, effectively suppressing the message.
     * `/usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js`: This specifies the file to be modified.
     * `&& systemctl restart pveproxy.service`: This part of the command restarts the `pveproxy.service` which is necessary for the changes to take effect.  The `&&` ensures the restart only happens *after* the `sed` command completes successfully.

3. **Verification:** After the command completes, the popup message should no longer appear when logging into Proxmox.  You may need to clear your browser cache if the message persists.



**Important Disclaimer:**

* **This modification is not officially supported by Proxmox.**  You are making changes to system files.
* **Backups are your friend:** While the command creates a `.bak` backup, it's always a good idea to have a full system backup before making any system-level changes.
* **Updates may revert changes:** Proxmox updates may overwrite the changes you've made. You may need to re-apply this fix after updates.
* **Consider a Proxmox Subscription:**  If you are using Proxmox in a production environment, consider purchasing a subscription to support the developers and receive official updates and support.



**Source:** [https://johnscs.com/remove-proxmox51-subscription-notice/](https://johnscs.com/remove-proxmox51-subscription-notice/)