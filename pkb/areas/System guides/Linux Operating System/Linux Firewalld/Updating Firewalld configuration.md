
### Removing Source IPs:

```
firewall-cmd --permanent --zone=trusted --remove-source=40.142.176.0/20
firewall-cmd --permanent --zone=trusted --remove-source=98.17.180.0/22
firewall-cmd --permanent --zone=trusted --remove-source=98.97.80.0/21
firewall-cmd --permanent --zone=trusted --remove-source=129.222.72.0/21




```