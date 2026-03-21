```js

# Get full list of active Inbound services
Get-NetFirewallRule | Where-Object {$_.Direction -eq "Inbound"} | Select-Object Name, DisplayName, Action

# Get full list of active Outbound services
Get-NetFirewallRule | Where-Object {$_.Direction -eq "Inbound"} | Select-Object Name, DisplayName, Action



```
