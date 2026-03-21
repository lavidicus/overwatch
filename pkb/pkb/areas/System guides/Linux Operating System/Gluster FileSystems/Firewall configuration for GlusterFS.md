# Firewall configuration for GlusterFS

Last edited time: April 27, 2023 12:27 PM
Owner: Jeremy Ingalls

Add GeoIP module to Firewall-CMD

```
# Add GeoIP module to Firewall-CMD
sudo dnf install -y firewalld-filesystem

sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" port port="24007" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" port port="24007" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" port port="24007" protocol="tcp" accept'

sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="!" ipset="united_states" reject'

sudo firewall-cmd --permanent --new-ipset=united_states --type=hash:net --option=family=inet --option=hashsize=4096 --option=maxelem=200000
sudo firewall-cmd --permanent --ipset=united_states --add-entry=0.0.0.0/0 --comment="United States"

sudo firewall-cmd --reload

```

```bash
sudo firewall-cmd --remove-port=24007/tcp --permanent
sudo firewall-cmd --remove-port=24008/tcp --permanent
sudo firewall-cmd --remove-port=24009/tcp --permanent
sudo firewall-cmd --remove-port=49152-49251/tcp --permanent
sudo firewall-cmd --reload

```

```
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" port port="24007" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" port port="24007" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" port port="24007" protocol="tcp" accept'

sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" port port="24008" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" port port="24008" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" port port="24008" protocol="tcp" accept'

sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" port port="24009" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" port port="24009" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" port port="24009" protocol="tcp" accept'

sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="104.128.188.150" port port="49152-49251" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="193.142.58.203" port port="49152-49251" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="31.25.10.203" port port="49152-49251" protocol="tcp" accept'
sudo firewall-cmd --reload

```

To remove the rules:

```bash
sudo firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="nd1" port port="24007" protocol="tcp" accept'
sudo firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="fs1" port port="24008" protocol="tcp" accept'
sudo firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="fs2" port port="24009" protocol="tcp" accept'
sudo firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="nd1" port port="49152-49251" protocol="tcp" accept'
sudo firewall-cmd --reload

```

[Blocking all IPs OCONUS](Firewall%20configuration%20for%20GlusterFS%206d7879a270834bd29dc8883435c308c2/Blocking%20all%20IPs%20OCONUS%206af67e3bf724406abf577b744eb71623.md)