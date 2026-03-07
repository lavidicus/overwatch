
Current configuration : 1993 bytes
!
version 12.2
service config
no service pad
service timestamps debug uptime
service timestamps log uptime
no service password-encryption
!
hostname Switch
!
!
no aaa new-model
system mtu routing 1500
ip subnet-zero
!
!
!
!
no file verify auto
spanning-tree mode pvst
spanning-tree extend system-id
!
vlan internal allocation policy ascending
!
interface GigabitEthernet0/1
!
interface GigabitEthernet0/2
!
interface GigabitEthernet0/3
!
interface GigabitEthernet0/4
!
interface GigabitEthernet0/5
!
interface GigabitEthernet0/6
!
interface GigabitEthernet0/7
!
interface GigabitEthernet0/8
!
interface GigabitEthernet0/9
!
interface GigabitEthernet0/10
!
interface GigabitEthernet0/11
!
interface GigabitEthernet0/12
!
interface GigabitEthernet0/13
!
interface GigabitEthernet0/14
!
interface GigabitEthernet0/15
!
interface GigabitEthernet0/16
!
interface GigabitEthernet0/17
!
interface GigabitEthernet0/18
!
interface GigabitEthernet0/19
!
interface GigabitEthernet0/20
!
interface GigabitEthernet0/21
!
interface GigabitEthernet0/22
!
interface GigabitEthernet0/23
!
interface GigabitEthernet0/24
!
interface GigabitEthernet0/25
!
interface GigabitEthernet0/26
!
interface GigabitEthernet0/27
!
interface GigabitEthernet0/28
!
interface GigabitEthernet0/29
!
interface GigabitEthernet0/30
!
interface GigabitEthernet0/31
!
interface GigabitEthernet0/32
!
interface GigabitEthernet0/33
!
interface GigabitEthernet0/34
!
interface GigabitEthernet0/35
!
interface GigabitEthernet0/36
!
interface GigabitEthernet0/37
!
interface GigabitEthernet0/38
!
interface GigabitEthernet0/39
!
interface GigabitEthernet0/40
!
interface GigabitEthernet0/41
!
interface GigabitEthernet0/42
!
interface GigabitEthernet0/43
!
interface GigabitEthernet0/44
!
interface GigabitEthernet0/45
!
interface GigabitEthernet0/46
!
interface GigabitEthernet0/47
!
interface GigabitEthernet0/48
!
interface Vlan1
 ip address dhcp
 no ip route-cache
!
ip http server
!
control-plane
!
!
line con 0
line vty 5 15
!
end

