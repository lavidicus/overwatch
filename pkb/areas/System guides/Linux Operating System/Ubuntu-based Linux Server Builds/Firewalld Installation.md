# Firewalld Installation

Last edited time: June 19, 2023 9:03 PM
Owner: Jeremy Ingalls

# Firewalld Installation

Firewalld is a firewall management tool that provides firewall functionality for Linux-based systems. This guide will provide detailed instructions on how to install and configure firewalld on Ubuntu-based Linux.

## Installation

1. Open the terminal on your Ubuntu-based Linux system.
2. Update the apt package index by running the following command:

```
sudo apt update

```

1. Install the firewalld package by running the following command:

```
sudo apt install firewalld

```

1. After the installation process is complete, start the firewalld service by running the following command:

```
sudo systemctl start firewalld

```

1. To make sure that firewalld starts automatically at system boot, run the following command:

```
sudo systemctl enable firewalld

```

## Configuration

Firewalld comes with a command-line interface called firewall-cmd that can be used to configure the firewall. Here are some examples of firewall-cmd commands that can be used to configure firewalld:

- To view the current firewall configuration:

```
sudo firewall-cmd --list-all

```

- To open a port for a specific protocol (e.g. TCP):

```
sudo firewall-cmd --zone=public --add-port={PORT_NUMBER}/tcp --permanent

```

Replace `{PORT_NUMBER}` with the actual port number.

- To remove an existing port:

```
sudo firewall-cmd --zone=public --remove-port={PORT_NUMBER}/tcp --permanent

```

Replace `{PORT_NUMBER}` with the actual port number.

- To allow traffic from a specific IP address:

```
sudo firewall-cmd --zone=public --add-source={IP_ADDRESS} --permanent

```

Replace `{IP_ADDRESS}` with the actual IP address.

- To remove an existing IP address:

```
sudo firewall-cmd --zone=public --remove-source={IP_ADDRESS} --permanent

```

Replace `{IP_ADDRESS}` with the actual IP address.

- To reload the firewall configuration after making changes:

```
sudo firewall-cmd --reload

```

## Conclusion

By following the steps outlined in this guide, you should now have firewalld installed and configured on your Ubuntu-based Linux system. Firewalld provides a powerful and flexible firewall solution that can help keep your system secure.