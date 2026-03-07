# IP Security (IPSEC)

Last edited time: May 17, 2023 2:31 PM
Owner: Jeremy Ingalls
Tags: IPSEC

# IPSEC on Linux

IPSEC (Internet Protocol Security) is a protocol used to secure internet communication by authenticating and encrypting each IP packet of a communication session. It is a widely-used protocol that provides security over the internet, especially in virtual private network (VPN) connections.

On Linux, IPSEC is implemented through the Linux kernel's NETKEY framework. The NETKEY framework provides the IPSEC functionality through the kernel's network stack, allowing for secure communication between two endpoints over a public network, such as the internet.

To configure IPSEC on Linux, one needs to install the necessary packages, such as strongSwan or OpenSWAN, which provide the IPSEC implementation on Linux. Once installed, the IPSEC configuration can be done using configuration files or through the use of graphical user interfaces such as the NetworkManager.

In IPSEC, two endpoints establish a secure communication channel through a process called "IKE" (Internet Key Exchange). During this process, the two endpoints agree on a set of parameters that will be used to secure their communication, such as the encryption and authentication methods to use. Once this is done, the two endpoints can start exchanging encrypted packets, ensuring the confidentiality and integrity of their communication.

In conclusion, IPSEC is a powerful protocol that provides secure communication over the internet. Its implementation on Linux through the NETKEY framework allows for easy and secure communication between two endpoints, making it a popular choice for VPN connections.

[IPSEC on Linux with PSK](IP%20Security%20(IPSEC)%20e207080a5aef4145be4bd3fa433ddd70/IPSEC%20on%20Linux%20with%20PSK%20ac2673502fd14cceb344a714b523484b.md)