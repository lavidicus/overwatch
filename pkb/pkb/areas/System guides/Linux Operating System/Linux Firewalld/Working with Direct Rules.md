# Working with Direct Rules

Last edited time: June 7, 2023 11:42 AM
Owner: Jeremy Ingalls

### Wiping all default rules and implementing Direct Rules

Wipe all the firewalld rules to default (Don't worry, SSH access or TCP-22 will remain open after wiping)

```
$ sudo rm -rf /etc/firewalld/zones/*
$ sudo rm -rf /usr/etc/firewalld/zones/*
$ sudo firewall-cmd --complete-reload

```

Allow ISP-1 and ISP-2 access to your VPS using direct rules (Both INPUT and FORWARD chain)

```
$ sudo firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 11.22.33.44/32 -j ACCEPT
$ sudo firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 55.66.77.88/32 -j ACCEPT
$ sudo firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 11.22.33.44/32 -j ACCEPT
$ sudo firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 55.66.77.88/32 -j ACCEPT

```

Allow return traffic (in other words, turn on stateful inspection. By default, firewalld is statefu)

```
$ sudo firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -m state --state RELATED,ESTABLISHED -j ACCEPT
$ sudo firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -m state --state RELATED,ESTABLISHED -j ACCEPT

```

Then block any other IP that is not part of ISP-1 or ISP-2

```
$ sudo firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -j DROP
$ sudo firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -j DROP

```

Reload the rules

```
$ sudo firewall-cmd --reload

```

Verify the rules

```
$ sudo firewall-cmd --direct --get-all-rules
```

## Example

```bash
[root@ds zones]# firewall-cmd --get-active-zones
public
  interfaces: eth0
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 98.97.80.0/21 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 98.97.80.0/21 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 166.141.120.122 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 166.141.120.122 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 98.17.180.0/22 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 98.17.180.0/22 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 129.222.72.0/21 -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -s 129.222.72.0/21 -j ACCEPT
success

[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -m state --state RELATED,ESTABLISHED -j ACCEPT
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -m state --state RELATED,ESTABLISHED -j ACCEPT
success

[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -j DROP
success
[root@ds zones]# firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -j DROP
success

[root@ds zones]# firewall-cmd --reload
success
[root@ds zones]# firewall-cmd --direct --get-all-rules
```