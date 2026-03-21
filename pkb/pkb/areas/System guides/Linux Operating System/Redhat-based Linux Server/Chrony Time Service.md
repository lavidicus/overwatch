# Chrony Time Service

Last edited time: April 27, 2023 3:12 PM
Owner: Jeremy Ingalls
Tags: RedHat-based Linux

# Chrony Time Service

## Introduction

Chrony is a versatile implementation of the Network Time Protocol (NTP) used to synchronize the system clock with a remote server. It is a popular alternative to the traditional NTP daemon (ntpd). In this document, we will guide you through the installation of Chrony Time Service on a RedHat-based Linux system.

## Prerequisites

Before proceeding with the installation, please ensure that you have root access to the Linux system and an active internet connection.

## Installation

1. Open a terminal window and update your system's package list:

```
sudo yum update

```

1. Install Chrony by running the following command:

```
sudo yum install chrony

```

1. Once the installation is complete, start the Chrony service by running the following command:

```
sudo systemctl start chronyd

```

1. To make sure that Chrony starts automatically at boot time, run the following command:

```
sudo systemctl enable chronyd

```

## Configuration

Chrony configuration file is located at `/etc/chrony.conf`. You can edit this file to add or modify the NTP servers used by Chrony. The default configuration file should work well for most scenarios.

## Usage

To check the status of the Chrony service, run the following command:

```
sudo systemctl status chronyd

```

To check the synchronization status, run the following command:

```
chronyc tracking

```

## Conclusion

In this document, we have covered the installation and configuration of Chrony Time Service on a RedHat-based Linux system. With Chrony, you can keep your system's clock synchronized with a remote server.