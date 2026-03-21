# Fail2Ban

Last edited time: April 27, 2023 3:13 PM
Owner: Jeremy Ingalls
Tags: Fail2Ban, RedHat-based Linux, Ubuntu-based Linux

# Fail2Ban

Fail2Ban is a software program that helps to prevent brute-force attacks by monitoring log files for repeated failed login attempts and then blocking the originating IP address. In this document, we will discuss how to update the configuration files for Fail2Ban.

## Installing Fail2Ban on RedHat-Based Linux (using epel-release package)

1. Install the `epel-release` package using the following command:

```
sudo yum install epel-release -y

```

1. Install Fail2Ban using the following command:

```
sudo yum install fail2ban fail2ban-firewalld -y

```

1. Once the installation is complete, you can start and enable the Fail2Ban service using the following commands:

```
sudo systemctl start fail2ban

sudo systemctl enable fail2ban

```

## Installing Fail2Ban on Ubuntu-Based Linux (using epel-release package)

1. Install the `epel-release` package using the following command:

```
sudo apt-get update

sudo apt-get install -y gnupg2

sudo apt-key adv --fetch-keys <https://download.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-8>

sudo sh -c 'echo "deb <http://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm>" >/etc/apt/sources.list.d/epel.list'

sudo apt-get update

```

1. Install Fail2Ban using the following command:

```
sudo apt-get install -y fail2ban

```

1. Once the installation is complete, you can start and enable the Fail2Ban service using the following commands:

```
sudo systemctl start fail2ban

sudo systemctl enable fail2ban

```

## Updating the Configuration Files

To update the Fail2Ban configuration files, follow these steps:

1. Locate the Fail2Ban configuration files. The default location of the configuration files is `/etc/fail2ban/`.
2. Before making any changes to the configuration files, it is recommended to create a backup of the original configuration files. You can create a backup by copying the configuration files to a different location.
3. Open the configuration file that you want to edit using a text editor. For example, to edit the Fail2Ban configuration file, open `/etc/fail2ban/jail.conf`.
4. Make the necessary changes to the configuration file. You can refer to the Fail2Ban documentation for information on the available configuration options.
5. Once you have made the changes to the configuration file, save the file and exit the text editor.
6. Restart the Fail2Ban service to apply the changes to the configuration files. You can restart the Fail2Ban service using the following command:

```
sudo systemctl restart fail2ban

```

That's it! You have successfully updated the configuration files for Fail2Ban. Now Fail2Ban will use the updated configuration settings to monitor the log files of your choice and protect your system against brute-force attacks.

# Review Jailed IPs and Hosts

To review the IPs that have been banned by Fail2Ban, you can use the following command:

```
sudo fail2ban-client status

```

This will show you the current status of Fail2Ban, including the number of IPs that have been banned and the corresponding jail name. You can also use the `fail2ban-client status <jail>` command to view the banned IPs for a specific jail. For example, to view the banned IPs for the SSH jail, you can use the following command:

```
sudo fail2ban-client status sshd

```

This will show you the list of banned IPs for the SSH jail.