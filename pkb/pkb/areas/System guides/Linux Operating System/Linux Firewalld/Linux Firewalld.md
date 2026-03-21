# Linux Firewalld

Last edited time: June 7, 2023 11:32 AM
Owner: Jeremy Ingalls
Tags: RedHat-based Linux, Ubuntu-based Linux

# Linux Firewalld

Linux firewalld is a firewall management tool that allows users to manage network traffic in their Linux operating system. This document will guide you through the process of installing firewalld on both Ubuntu and Redhat based Linux. Moreover, we will provide examples of adding and removing ports permanently.

## Installing firewalld on Ubuntu

To install firewalld on Ubuntu, follow these steps:

1. Open a terminal window and enter the following command to update the package list:
    
    ```
    sudo apt-get update
    
    ```
    
2. Once the package list is updated, enter the following command to install firewalld:
    
    ```
    sudo apt-get install firewalld
    
    ```
    
3. After installing firewalld, enter the following command to start the firewalld service:
    
    ```
    sudo systemctl start firewalld
    
    ```
    
4. Finally, enable the firewalld service to start at boot time using the following command:
    
    ```
    sudo systemctl enable firewalld
    
    ```
    

## Installing firewalld on Redhat based Linux

To install firewalld on Redhat based Linux, follow these steps:

1. Open a terminal window and enter the following command to update the package list:
    
    ```
    sudo yum update
    
    ```
    
2. Once the package list is updated, enter the following command to install firewalld:
    
    ```
    sudo yum install firewalld
    
    ```
    
3. After installing firewalld, enter the following command to start the firewalld service:
    
    ```
    sudo systemctl start firewalld
    
    ```
    
4. Finally, enable the firewalld service to start at boot time using the following command:
    
    ```
    sudo systemctl enable firewalld
    
    ```
    

## Adding and removing ports permanently

To add a port permanently to firewalld, follow these steps:

1. Open a terminal window and enter the following command to add the port:
    
    ```
    sudo firewall-cmd --zone=public --add-port={port}/tcp --permanent
    
    ```
    
2. Replace `{port}` with the number of the port you want to add.
3. To remove a port permanently from firewalld, enter the following command:
    
    ```
    sudo firewall-cmd --zone=public --remove-port={port}/tcp --permanent
    
    ```
    
4. Again, replace `{port}` with the number of the port you want to remove.
5. Finally, reload the firewall configuration using the following command:
    
    ```
    sudo firewall-cmd --reload
    
    ```
    

This document has provided you with a step-by-step guide to installing firewalld on both Ubuntu and Redhat based Linux. Also, we have given you examples of adding and removing ports permanently. Happy networking!

### Firewall-cmd Commands & Syntax

```bash
firewall-cmd --help

Usage: firewall-cmd [OPTIONS...]

General Options
  -h, --help           Prints a short help text and exits
  -V, --version        Print the version string of firewalld
  -q, --quiet          Do not print status messages

Status Options
  --state              Return and print firewalld state
  --reload             Reload firewall and keep state information
  --complete-reload    Reload firewall and lose state information
  --runtime-to-permanent
                       Create permanent from runtime configuration
  --check-config       Check permanent configuration for errors

Log Denied Options
  --get-log-denied     Print the log denied value
  --set-log-denied=<value>
                       Set log denied value

Permanent Options
  --permanent          Set an option permanently
                       Usable for options marked with [P]

Zone Options
  --get-default-zone   Print default zone for connections and interfaces
  --set-default-zone=<zone>
                       Set default zone
  --get-active-zones   Print currently active zones
  --get-zones          Print predefined zones [P]
  --get-services       Print predefined services [P]
  --get-icmptypes      Print predefined icmptypes [P]
  --get-zone-of-interface=<interface>
                       Print name of the zone the interface is bound to [P]
  --get-zone-of-source=<source>[/<mask>]|<MAC>|ipset:<ipset>
                       Print name of the zone the source is bound to [P]
  --list-all-zones     List everything added for or enabled in all zones [P]
  --new-zone=<zone>    Add a new zone [P only]
  --new-zone-from-file=<filename> [--name=<zone>]
                       Add a new zone from file with optional name [P only]
  --delete-zone=<zone> Delete an existing zone [P only]
  --load-zone-defaults=<zone>
                       Load zone default settings [P only]
  --zone=<zone>        Use this zone to set or query options, else default zone
                       Usable for options marked with [Z]
  --info-zone=<zone>   Print information about a zone
  --path-zone=<zone>   Print file path of a zone [P only]

Policy Options
  --get-policies       Print predefined policies
  --get-active-policies
                       Print currently active policies
  --list-all-policies  List everything added for or enabled in all policies
  --new-policy=<policy>
                       Add a new empty policy
  --new-policy-from-file=<filename> [--name=<policy>]
                       Add a new policy from file with optional name override [P only]
  --delete-policy=<policy>
                       Delete an existing policy
  --load-policy-defaults=<policy>
                       Load policy default settings
  --policy=<policy>    Use this policy to set or query options
                       Usable for options marked with [O]
  --info-policy=<policy>
                       Print information about a policy
  --path-policy=<policy>
                       Print file path of a policy

IPSet Options
  --get-ipset-types    Print the supported ipset types
  --new-ipset=<ipset> --type=<ipset type> [--option=<key>[=<value>]]..
                       Add a new ipset [P only]
  --new-ipset-from-file=<filename> [--name=<ipset>]
                       Add a new ipset from file with optional name [P only]
  --delete-ipset=<ipset>
                       Delete an existing ipset [P only]
  --load-ipset-defaults=<ipset>
                       Load ipset default settings [P only]
  --info-ipset=<ipset> Print information about an ipset
  --path-ipset=<ipset> Print file path of an ipset [P only]
  --get-ipsets         Print predefined ipsets
  --ipset=<ipset> --set-description=<description>
                       Set new description to ipset [P only]
  --ipset=<ipset> --get-description
                       Print description for ipset [P only]
  --ipset=<ipset> --set-short=<description>
                       Set new short description to ipset [P only]
  --ipset=<ipset> --get-short
                       Print short description for ipset [P only]
  --ipset=<ipset> --add-entry=<entry>
                       Add a new entry to an ipset [P]
  --ipset=<ipset> --remove-entry=<entry>
                       Remove an entry from an ipset [P]
  --ipset=<ipset> --query-entry=<entry>
                       Return whether ipset has an entry [P]
  --ipset=<ipset> --get-entries
                       List entries of an ipset [P]
  --ipset=<ipset> --add-entries-from-file=<entry>
                       Add a new entries to an ipset [P]
  --ipset=<ipset> --remove-entries-from-file=<entry>
                       Remove entries from an ipset [P]

IcmpType Options
  --new-icmptype=<icmptype>
                       Add a new icmptype [P only]
  --new-icmptype-from-file=<filename> [--name=<icmptype>]
                       Add a new icmptype from file with optional name [P only]
  --delete-icmptype=<icmptype>
                       Delete an existing icmptype [P only]
  --load-icmptype-defaults=<icmptype>
                       Load icmptype default settings [P only]
  --info-icmptype=<icmptype>
                       Print information about an icmptype
  --path-icmptype=<icmptype>
                       Print file path of an icmptype [P only]
  --icmptype=<icmptype> --set-description=<description>
                       Set new description to icmptype [P only]
  --icmptype=<icmptype> --get-description
                       Print description for icmptype [P only]
  --icmptype=<icmptype> --set-short=<description>
                       Set new short description to icmptype [P only]
  --icmptype=<icmptype> --get-short
                       Print short description for icmptype [P only]
  --icmptype=<icmptype> --add-destination=<ipv>
                       Enable destination for ipv in icmptype [P only]
  --icmptype=<icmptype> --remove-destination=<ipv>
                       Disable destination for ipv in icmptype [P only]
  --icmptype=<icmptype> --query-destination=<ipv>
                       Return whether destination ipv is enabled in icmptype [P only]
  --icmptype=<icmptype> --get-destinations
                       List destinations in icmptype [P only]

Service Options
  --new-service=<service>
                       Add a new service [P only]
  --new-service-from-file=<filename> [--name=<service>]
                       Add a new service from file with optional name [P only]
  --delete-service=<service>
                       Delete an existing service [P only]
  --load-service-defaults=<service>
                       Load icmptype default settings [P only]
  --info-service=<service>
                       Print information about a service
  --path-service=<service>
                       Print file path of a service [P only]
  --service=<service> --set-description=<description>
                       Set new description to service [P only]
  --service=<service> --get-description
                       Print description for service [P only]
  --service=<service> --set-short=<description>
                       Set new short description to service [P only]
  --service=<service> --get-short
                       Print short description for service [P only]
  --service=<service> --add-port=<portid>[-<portid>]/<protocol>
                       Add a new port to service [P only]
  --service=<service> --remove-port=<portid>[-<portid>]/<protocol>
                       Remove a port from service [P only]
  --service=<service> --query-port=<portid>[-<portid>]/<protocol>
                       Return whether the port has been added for service [P only]
  --service=<service> --get-ports
                       List ports of service [P only]
  --service=<service> --add-protocol=<protocol>
                       Add a new protocol to service [P only]
  --service=<service> --remove-protocol=<protocol>
                       Remove a protocol from service [P only]
  --service=<service> --query-protocol=<protocol>
                       Return whether the protocol has been added for service [P only]
  --service=<service> --get-protocols
                       List protocols of service [P only]
  --service=<service> --add-source-port=<portid>[-<portid>]/<protocol>
                       Add a new source port to service [P only]
  --service=<service> --remove-source-port=<portid>[-<portid>]/<protocol>
                       Remove a source port from service [P only]
  --service=<service> --query-source-port=<portid>[-<portid>]/<protocol>
                       Return whether the source port has been added for service [P only]
  --service=<service> --get-source-ports
                       List source ports of service [P only]
  --service=<service> --add-helper=<helper>
                       Add a new helper to service [P only]
  --service=<service> --remove-helper=<helper>
                       Remove a helper from service [P only]
  --service=<service> --query-helper=<helper>
                       Return whether the helper has been added for service [P only]
  --service=<service> --get-service-helpers
                       List helpers of service [P only]
  --service=<service> --set-destination=<ipv>:<address>[/<mask>]
                       Set destination for ipv to address in service [P only]
  --service=<service> --remove-destination=<ipv>
                       Disable destination for ipv i service [P only]
  --service=<service> --query-destination=<ipv>:<address>[/<mask>]
                       Return whether destination ipv is set for service [P only]
  --service=<service> --get-destinations
                       List destinations in service [P only]
  --service=<service> --add-include=<service>
                       Add a new include to service [P only]
  --service=<service> --remove-include=<service>
                       Remove a include from service [P only]
  --service=<service> --query-include=<service>
                       Return whether the include has been added for service [P only]
  --service=<service> --get-includes
                       List includes of service [P only]

Options to Adapt and Query Zones and Policies
  --list-all           List everything added for or enabled [P] [Z] [O]
  --timeout=<timeval>  Enable an option for timeval time, where timeval is
                       a number followed by one of letters 's' or 'm' or 'h'
                       Usable for options marked with [T]
  --set-description=<description>
                       Set new description [P only] [Z] [O]
  --get-description    Print description [P only] [Z] [O]
  --get-target         Get the target [P only] [Z] [O]
  --set-target=<target>
                       Set the target [P only] [Z] [O]
  --set-short=<description>
                       Set new short description [Z] [O]
  --get-short          Print short description [P only] [Z] [O]
  --list-services      List services added [P] [Z]
  --add-service=<service>
                       Add a service [P] [Z] [O] [T]
  --remove-service=<service>
                       Remove a service [P] [Z] [O]
  --query-service=<service>
                       Return whether service has been added [P] [Z] [O]
  --list-ports         List ports added [P] [Z] [O]
  --add-port=<portid>[-<portid>]/<protocol>
                       Add the port [P] [Z] [O] [T]
  --remove-port=<portid>[-<portid>]/<protocol>
                       Remove the port [P] [Z] [O]
  --query-port=<portid>[-<portid>]/<protocol>
                       Return whether the port has been added [P] [Z] [O]
  --list-protocols     List protocols added [P] [Z] [O]
  --add-protocol=<protocol>
                       Add the protocol [P] [Z] [O] [T]
  --remove-protocol=<protocol>
                       Remove the protocol [P] [Z] [O]
  --query-protocol=<protocol>
                       Return whether the protocol has been added [P] [Z] [O]
  --list-source-ports  List source ports added [P] [Z] [O]
  --add-source-port=<portid>[-<portid>]/<protocol>
                       Add the source port [P] [Z] [O] [T]
  --remove-source-port=<portid>[-<portid>]/<protocol>
                       Remove the source port [P] [Z] [O]
  --query-source-port=<portid>[-<portid>]/<protocol>
                       Return whether the source port has been added [P] [Z] [O]
  --list-icmp-blocks   List Internet ICMP type blocks added [P] [Z] [O]
  --add-icmp-block=<icmptype>
                       Add an ICMP block [P] [Z] [O] [T]
  --remove-icmp-block=<icmptype>
                       Remove the ICMP block [P] [Z] [O]
  --query-icmp-block=<icmptype>
                       Return whether an ICMP block has been added [P] [Z] [O]
  --list-forward-ports List IPv4 forward ports added [P] [Z] [O]
  --add-forward-port=port=<portid>[-<portid>]:proto=<protocol>[:toport=<portid>[-<portid>]][:toaddr=<address>[/<mask>]]
                       Add the IPv4 forward port [P] [Z] [O] [T]
  --remove-forward-port=port=<portid>[-<portid>]:proto=<protocol>[:toport=<portid>[-<portid>]][:toaddr=<address>[/<mask>]]
                       Remove the IPv4 forward port [P] [Z] [O]
  --query-forward-port=port=<portid>[-<portid>]:proto=<protocol>[:toport=<portid>[-<portid>]][:toaddr=<address>[/<mask>]]
                       Return whether the IPv4 forward port has been added [P] [Z] [O]
  --add-masquerade     Enable IPv4 masquerade [P] [Z] [O] [T]
  --remove-masquerade  Disable IPv4 masquerade [P] [Z] [O]
  --query-masquerade   Return whether IPv4 masquerading has been enabled [P] [Z] [O]
  --list-rich-rules    List rich language rules added [P] [Z] [O]
  --add-rich-rule=<rule>
                       Add rich language rule 'rule' [P] [Z] [O] [T]
  --remove-rich-rule=<rule>
                       Remove rich language rule 'rule' [P] [Z] [O]
  --query-rich-rule=<rule>
                       Return whether a rich language rule 'rule' has been
                       added [P] [Z] [O]

Options to Adapt and Query Zones
  --add-icmp-block-inversion
                       Enable inversion of icmp blocks for a zone [P] [Z]
  --remove-icmp-block-inversion
                       Disable inversion of icmp blocks for a zone [P] [Z]
  --query-icmp-block-inversion
                       Return whether inversion of icmp blocks has been enabled
                       for a zone [P] [Z]
  --add-forward        Enable forwarding of packets between interfaces and
                       sources in a zone [P] [Z] [T]
  --remove-forward     Disable forwarding of packets between interfaces and
                       sources in a zone [P] [Z]
  --query-forward      Return whether forwarding of packets between interfaces
                       and sources has been enabled for a zone [P] [Z]

Options to Adapt and Query Policies
  --get-priority       Get the priority [P only] [O]
  --set-priority=<priority>
                       Set the priority [P only] [O]
  --list-ingress-zones
                       List ingress zones that are bound to a policy [P] [O]
  --add-ingress-zone=<zone>
                       Add the ingress zone to a policy [P] [O]
  --remove-ingress-zone=<zone>
                       Remove the ingress zone from a policy [P] [O]
  --query-ingress-zone=<zone>
                       Query whether the ingress zone has been adedd to a
                       policy [P] [O]
  --list-egress-zones
                       List egress zones that are bound to a policy [P] [O]
  --add-egress-zone=<zone>
                       Add the egress zone to a policy [P] [O]
  --remove-egress-zone=<zone>
                       Remove the egress zone from a policy [P] [O]
  --query-egress-zone=<zone>
                       Query whether the egress zone has been adedd to a
                       policy [P] [O]

Options to Handle Bindings of Interfaces
  --list-interfaces    List interfaces that are bound to a zone [P] [Z]
  --add-interface=<interface>
                       Bind the <interface> to a zone [P] [Z]
  --change-interface=<interface>
                       Change zone the <interface> is bound to [P] [Z]
  --query-interface=<interface>
                       Query whether <interface> is bound to a zone [P] [Z]
  --remove-interface=<interface>
                       Remove binding of <interface> from a zone [P] [Z]

Options to Handle Bindings of Sources
  --list-sources       List sources that are bound to a zone [P] [Z]
  --add-source=<source>[/<mask>]|<MAC>|ipset:<ipset>
                       Bind the source to a zone [P] [Z]
  --change-source=<source>[/<mask>]|<MAC>|ipset:<ipset>
                       Change zone the source is bound to [Z]
  --query-source=<source>[/<mask>]|<MAC>|ipset:<ipset>
                       Query whether the source is bound to a zone [P] [Z]
  --remove-source=<source>[/<mask>]|<MAC>|ipset:<ipset>
                       Remove binding of the source from a zone [P] [Z]

Helper Options
  --new-helper=<helper> --module=<module> [--family=<family>]
                       Add a new helper [P only]
  --new-helper-from-file=<filename> [--name=<helper>]
                       Add a new helper from file with optional name [P only]
  --delete-helper=<helper>
                       Delete an existing helper [P only]
  --load-helper-defaults=<helper>
                       Load helper default settings [P only]
  --info-helper=<helper> Print information about an helper
  --path-helper=<helper> Print file path of an helper [P only]
  --get-helpers         Print predefined helpers
  --helper=<helper> --set-description=<description>
                       Set new description to helper [P only]
  --helper=<helper> --get-description
                       Print description for helper [P only]
  --helper=<helper> --set-short=<description>
                       Set new short description to helper [P only]
  --helper=<helper> --get-short
                       Print short description for helper [P only]
  --helper=<helper> --add-port=<portid>[-<portid>]/<protocol>
                       Add a new port to helper [P only]
  --helper=<helper> --remove-port=<portid>[-<portid>]/<protocol>
                       Remove a port from helper [P only]
  --helper=<helper> --query-port=<portid>[-<portid>]/<protocol>
                       Return whether the port has been added for helper [P only]
  --helper=<helper> --get-ports
                       List ports of helper [P only]
  --helper=<helper> --set-module=<module>
                       Set module to helper [P only]
  --helper=<helper> --get-module
                       Get module from helper [P only]
  --helper=<helper> --set-family={ipv4|ipv6|}
                       Set family for helper [P only]
  --helper=<helper> --get-family
                       Get module from helper [P only]

Direct Options
  --direct             First option for all direct options
  --get-all-chains
                       Get all chains [P]
  --get-chains {ipv4|ipv6|eb} <table>
                       Get all chains added to the table [P]
  --add-chain {ipv4|ipv6|eb} <table> <chain>
                       Add a new chain to the table [P]
  --remove-chain {ipv4|ipv6|eb} <table> <chain>
                       Remove the chain from the table [P]
  --query-chain {ipv4|ipv6|eb} <table> <chain>
                       Return whether the chain has been added to the table [P]
  --get-all-rules
                       Get all rules [P]
  --get-rules {ipv4|ipv6|eb} <table> <chain>
                       Get all rules added to chain in table [P]
  --add-rule {ipv4|ipv6|eb} <table> <chain> <priority> <arg>...
                       Add rule to chain in table [P]
  --remove-rule {ipv4|ipv6|eb} <table> <chain> <priority> <arg>...
                       Remove rule with priority from chain in table [P]
  --remove-rules {ipv4|ipv6|eb} <table> <chain>
                       Remove rules from chain in table [P]
  --query-rule {ipv4|ipv6|eb} <table> <chain> <priority> <arg>...
                       Return whether a rule with priority has been added to
                       chain in table [P]
  --passthrough {ipv4|ipv6|eb} <arg>...
                       Pass a command through (untracked by firewalld)
  --get-all-passthroughs
                       Get all tracked passthrough rules [P]
  --get-passthroughs {ipv4|ipv6|eb} <arg>...
                       Get tracked passthrough rules [P]
  --add-passthrough {ipv4|ipv6|eb} <arg>...
                       Add a new tracked passthrough rule [P]
  --remove-passthrough {ipv4|ipv6|eb} <arg>...
                       Remove a tracked passthrough rule [P]
  --query-passthrough {ipv4|ipv6|eb} <arg>...
                       Return whether the tracked passthrough rule has been
                       added [P]

Lockdown Options
  --lockdown-on        Enable lockdown.
  --lockdown-off       Disable lockdown.
  --query-lockdown     Query whether lockdown is enabled

Lockdown Whitelist Options
  --list-lockdown-whitelist-commands
                       List all command lines that are on the whitelist [P]
  --add-lockdown-whitelist-command=<command>
                       Add the command to the whitelist [P]
  --remove-lockdown-whitelist-command=<command>
                       Remove the command from the whitelist [P]
  --query-lockdown-whitelist-command=<command>
                       Query whether the command is on the whitelist [P]
  --list-lockdown-whitelist-contexts
                       List all contexts that are on the whitelist [P]
  --add-lockdown-whitelist-context=<context>
                       Add the context context to the whitelist [P]
  --remove-lockdown-whitelist-context=<context>
                       Remove the context from the whitelist [P]
  --query-lockdown-whitelist-context=<context>
                       Query whether the context is on the whitelist [P]
  --list-lockdown-whitelist-uids
                       List all user ids that are on the whitelist [P]
  --add-lockdown-whitelist-uid=<uid>
                       Add the user id uid to the whitelist [P]
  --remove-lockdown-whitelist-uid=<uid>
                       Remove the user id uid from the whitelist [P]
  --query-lockdown-whitelist-uid=<uid>
                       Query whether the user id uid is on the whitelist [P]
  --list-lockdown-whitelist-users
                       List all user names that are on the whitelist [P]
  --add-lockdown-whitelist-user=<user>
                       Add the user name user to the whitelist [P]
  --remove-lockdown-whitelist-user=<user>
                       Remove the user name user from the whitelist [P]
  --query-lockdown-whitelist-user=<user>
                       Query whether the user name user is on the whitelist [P]

Panic Options
  --panic-on           Enable panic mode
  --panic-off          Disable panic mode
  --query-panic        Query whether panic mode is enabled
```

[Working with Zones](Linux%20Firewalld%2074eb871fcddb4626b5400fae4046c48d/Working%20with%20Zones%20e0c838b1d66843d08716e984e17a342a.md)

[Working with Direct Rules](Linux%20Firewalld%2074eb871fcddb4626b5400fae4046c48d/Working%20with%20Direct%20Rules%20bfc8977200c14f6182260dbaee578dd9.md)