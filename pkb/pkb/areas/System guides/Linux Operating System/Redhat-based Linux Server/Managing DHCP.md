# Managing DHCP

Last edited time: May 17, 2023 10:14 PM
Owner: Jeremy Ingalls

# Managing DHCP

In Red-hat based Linux systems, managing DHCP addresses and renewals can be done through the following steps:

1. Install the DHCP client package:

```
sudo yum install dhcp

```

1. Configure the DHCP client:

Edit the /etc/dhcp/dhclient.conf file and add the following lines:

```
timeout 300;
retry 60;
reboot 10;

```

These lines set the timeout, retry, and reboot intervals for the DHCP client.

1. Start the DHCP client:

```
sudo systemctl start dhcpd

```

1. Check the DHCP client status:

```
sudo systemctl status dhcpd

```

This command should display the DHCP client's current status.

1. Renew the DHCP lease:

To renew the DHCP lease manually, run the following command:

```
sudo dhclient -r
sudo dhclient

```

The first command releases the current DHCP lease, while the second command requests a new lease.

1. Configure DHCP server options:

To configure DHCP server options, edit the /etc/dhcp/dhcpd.conf file and add the necessary options.

1. Restart the DHCP server:

```
sudo systemctl restart dhcpd

```

These steps should enable you to manage DHCP addresses and renewals on Red-hat based Linux systems.