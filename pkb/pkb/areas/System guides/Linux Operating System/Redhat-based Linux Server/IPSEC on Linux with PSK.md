# IPSEC on Linux with PSK

Last edited time: April 23, 2023 9:42 PM
Owner: Jeremy Ingalls

To install and configure IPSEC on Redhat or Ubuntu Linux, follow these steps:

1. Install IPSEC packages on Linux:

For Redhat, run the following command in the terminal:

```
sudo yum install -y openswan

```

For Ubuntu, run the following command in the terminal:

```
sudo apt-get install -y openswan

```

1. Configure IPSEC:

Edit the /etc/ipsec.conf file with your favorite editor and add the following configuration:

```
conn myvpn
     authby=secret
     auto=add
     left=%defaultroute
     leftid=<ip address of local machine>
     leftsubnet=<local network ip/mask>
     right=<ip address of remote machine>
     rightsubnet=<remote network ip/mask>

```

1. Add PSK:

Add the following line to /etc/ipsec.secrets:

```
<ip address of local machine> <ip address of remote machine> : PSK "<your secret key>"

```

1. Start IPSEC service:

For Redhat, run the following command in the terminal:

```
sudo systemctl start ipsec

```

For Ubuntu, run the following command in the terminal:

```
sudo service ipsec start

```

Now any system configured with the same pre shared key can communicate with any system with IPSEC installed.