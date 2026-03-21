# Set MTU on Wireless device

Last edited time: April 27, 2023 3:14 PM
Owner: Jeremy Ingalls

1. Use Network Manager CLI to get connection information:

```
sudo nmcli device status

```

     Example: 

```
[localadmin@fs network-scripts]$ sudo nmcli device status
DEVICE          TYPE      STATE         CONNECTION
wlp2s0          wifi      connected     RRB WiFi
enp0s25         ethernet  connected     enp0s25
p2p-dev-wlp2s0  wifi-p2p  disconnected    --
lo              loopback  unmanaged       --
```

1. Manually set the MTU setting:

```
sudo nmcli connection modify "RRB WiFi" 802-11-wireless.mtu 1397

```

1. Restart NetworkManager:

```
sudo systemctl restart NetworkManager

```

1. Verify the new MTU value:

```
[localadmin@fs network-scripts]$ ifconfig wlp2s0
wlp2s0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1397
        inet 10.201.2.200  netmask 255.0.0.0  broadcast 10.255.255.255
        inet6 fe80::264a:fd94:2c18:4eb8  prefixlen 64  scopeid 0x20<link>
        ether 00:16:eb:c8:c3:dc  txqueuelen 1000  (Ethernet)
        RX packets 970989  bytes 317373044 (302.6 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 1722056  bytes 2399463685 (2.2 GiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```