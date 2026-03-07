# Enabling Nested Virtualization for Windows 10 based Hyper-V

Last edited time: May 7, 2023 5:16 PM
Owner: Jeremy Ingalls

Nested virtualization is a feature that allows a virtual machine to run inside another virtual machine. This can be useful for testing, development, and other purposes. Windows 10 based Hyper-V supports nested virtualization, but it needs to be enabled first. Here are the steps to enable nested virtualization:

1. Check if your processor supports nested virtualization. To do this, open PowerShell as an administrator and run the following command:
2. List the list of all available virtual machines running on Hyper-V:

```powershell
Get-VM | Select-Object -Property Name, State
```

1. List the virtual machine properties for a VM:

```powershell
Get-VMProcessor -VMName <VMName> | Select-Object -Property *
```

```powershell
PS C:\Windows\system32> Get-VMProcessor -VMName "Personal -  Windows 10" | Select-Object -Property *

VMCheckpointId                               : 00000000-0000-0000-0000-000000000000
VMCheckpointName                             :
ResourcePoolName                             : Primordial
Count                                        : 4
CompatibilityForMigrationEnabled             : False
CompatibilityForOlderOperatingSystemsEnabled : False
HwThreadCountPerCore                         : 0
ExposeVirtualizationExtensions               : False
EnablePerfmonPmu                             : False
EnablePerfmonLbr                             : False
EnablePerfmonPebs                            : False
EnablePerfmonIpt                             : False
EnableLegacyApicMode                         : False
AllowACountMCount                            : True
Maximum                                      : 100
Reserve                                      : 15
RelativeWeight                               : 100
MaximumCountPerNumaNode                      : 16
MaximumCountPerNumaSocket                    : 1
EnableHostResourceProtection                 : False
OperationalStatus                            : {Ok, HostResourceProtectionDisabled}
StatusDescription                            : {OK, Host resource protection is disabled.}
Name                                         : Processor
Id                                           : Microsoft:E1815CE7-7FFA-4C57-9034-5BC4BD929A01\b637f346-6a0e-4dec-af52-b
                                               d70cb80a21d\0
VMId                                         : e1815ce7-7ffa-4c57-9034-5bc4bd929a01
VMName                                       : Personal -  Windows 10
VMSnapshotId                                 : 00000000-0000-0000-0000-000000000000
VMSnapshotName                               :
CimSession                                   : CimSession: .
ComputerName                                 : IS0
IsDeleted                                    : False
```

Look for the value of the `ExposeVirtualizationExtensions` property. If it is set to `True`, then your processor supports nested virtualization.

1. Enable Hyper-V on your Windows 10 host machine. To do this, go to Control Panel > Programs > Turn Windows features on or off. Check the box next to Hyper-V and click OK. Restart your computer if prompted.
2. Create a new virtual machine or use an existing one. Make sure that the virtual machine is turned off.
3. Open PowerShell as an administrator and run the following command to enable nested virtualization:

`Set-VMProcessor -VMName <VMName> -ExposeVirtualizationExtensions $true`

Replace `<VMName>` with the name of your virtual machine.

1. Start the virtual machine and install the necessary operating system and software.

That's it! Your virtual machine should now be able to run other virtual machines inside it.

Note that enabling nested virtualization may have a performance impact on your virtual machines, so it's important to test and monitor their performance after enabling this feature.