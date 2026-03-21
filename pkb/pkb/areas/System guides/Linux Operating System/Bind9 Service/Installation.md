# Status: Working

## Installation of the Bind9 service for Linux

## 1. Apt Install 
```
$ sudo apt install bind9 dnsutils -y
```

## 2. Edit Configuration 
 
### 2.1  $ sudo vi /etc/bind/named.conf

#### 2.1.1  Add the following lines: 
```
include "/etc/bind/named.conf.options";
include "/etc/bind/named.conf.local";  
```
### 2.2  $ sudo vi /etc/bind/named.conf.local

#### 2.2.1 Add the following lines:
```
zone "9xc.local" {
type master;
file "/etc/bind/zones/db.9xc.local";
allow-transfer { 172.16.254.253; };
};

zone "254.16.172.in-addr.arpa" {
type master;
file "/etc/bind/zones/db.254.16.172";
allow-transfer { 172.16.254.253; };
};

zone "." IN {
type hint;
file "/var/lib/bind/named.ca";
};
```

#### 2.2.2 Retrieve Root hints:
```
wget ftp://ftp.rs.internic.net/domain/db.cache -O /var/lib/bind/named.ca
chown bind:bind /var/lib/bind/named.ca
```
### 2.3 Generate zone and DNS Database files

#### 2.3.1 $ sudo mkdir -p /etc/bind/zones
#### 2.3.2 $ sudo vi /etc/bind/zones/db.9xc.local
#### 2.3.2.1 Add the following lines:
```
;
; BIND data file for local loopback interface
;
$TTL    604800
@       IN      SOA     ns1.9xc.local. root.9xc.local. (
                              4         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
; Name Server records:
@               IN      NS      ns1.9xc.local.
@               IN      NS      ads.9xc.local.

; A records:
@       IN      A       172.16.254.15
@       IN      A       172.16.254.253
ns1     IN      A       172.16.254.15
ads     IN      A       172.16.254.253
ads     IN      A       100.123.179.165
```

#### 2.3.3 $ sudo vi /etc/bind/zones/db.254.16.172
#### 2.3.3.1 Add the following lines:
```
;
; BIND reverse data file for local loopback interface
;
$TTL    604800
@       IN      SOA     9xc.local. root.9xc.local. (
                              4         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
; Name Servers:
        IN      NS      ns1.9xc.local.
        IN      NS      ads.9xc.local.

; PTR Records
15      IN      PTR     ns1.9xc.local.
253     IN      PTR     ads.9xc.local.
```

### 2.4 Update system and prevent overwriting by PVE
#### 2.4.1 $ sudo touch /etc/.pve-ignore.hosts
#### 2.4.2 $ sudo touch /etc/.pve-ignore.resolv.conf
#### 2.4.3 $ sudo vi /etc/resolv.conf
#### 2.4.3.1 Add the following lines:
```
search 9xc.local
nameserver 172.16.254.15
```
### 2.5 $ sudo systemctl restart bind9
