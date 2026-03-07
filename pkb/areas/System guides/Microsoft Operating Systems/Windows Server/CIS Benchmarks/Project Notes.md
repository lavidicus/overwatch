
```js
# CIS Benchmark for Windows Server 2019 - PowerShell Script to apply recommended system changes

# Disable SMBv1 Protocol
Set-SmbServerConfiguration -EnableSMB1Protocol $false

# Ensure Windows Remote Management (WinRM) service is enabled
Set-Service -Name "WinRM" -StartupType Automatic

# Ensure Windows Remote Management (WinRM) service is configured for HTTPS
Set-Item -Path "WSMan:\localhost\Service\Auth\Basic" -Value $false
Set-Item -Path "WSMan:\localhost\Service\Auth\Kerberos" -Value $true
Set-Item -Path "WSMan:\localhost\Service\Auth\CredSSP" -Value $false
Set-Item -Path "WSMan:\localhost\Service\AllowUnencrypted" -Value $false
Set-Item -Path "WSMan:\localhost\Service\CertMapping\" -Value @{Issuer="*";Certificate="*";Enabled=$true}
Set-Item -Path "WSMan:\localhost\Service\RootSDDL" -Value "O:NSG:BAD:P(A;;GA;;;BA)(A;;GR;;;IU)S:P(AU;FA;GA;;;WD)(AU;SA;GXGW;;;WD)"

# Ensure Windows Remote Management (WinRM) client sends credentials securely
Set-Item -Path "WSMan:\localhost\Client\Auth\CredSSP" -Value $true

# Disable Remote Desktop Services (RDS) if not required
Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 1

# Ensure strong Windows NTLMv2 authentication is enforced
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "NTLMMinClientSec" -Value 5376

# Ensure "Network security: LDAP client signing requirements" is configured
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LDAP" -Name "LDAPClientIntegrity" -Value 1

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) clients" is configured
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LmCompatibilityLevel" -Value 5
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "MinimumSecurityLevel" -Value 3

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) servers" is configured
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "NTLMMinServerSec" -Value 5376

# Ensure "Network security: Restrict NTLM: Audit NTLM authentication in this domain" is configured
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "AuditBaseObjects" -Value 1

# Ensure "Network security: Restrict NTLM: Incoming NTLM traffic" is set to "Deny all accounts"
Set-ItemProperty -Path "

# Ensure "Network security: Restrict NTLM: Incoming NTLM traffic" is set to "Deny all accounts"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "RestrictReceivingNTLMTraffic" -Value 2

# Ensure "Network security: Restrict NTLM: Outgoing NTLM traffic to remote servers" is set to "Require NTLMv2 session security"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "RestrictSendingNTLMTraffic" -Value 2

# Ensure "System cryptography: Force strong key protection for user keys stored on the computer" is configured

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Cryptography" -Name "ForceKeyProtection" -Value 2

# Ensure "System cryptography: Use FIPS compliant algorithms for encryption, hashing, and signing" is configured

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\FIPSAlgorithmPolicy" -Name "Enabled" -Value 1

# Ensure "User Account Control: Admin Approval Mode for the Built-in Administrator account" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "FilterAdministratorToken" -Value 1

# Ensure "User Account Control: Behavior of the elevation prompt for administrators in Admin Approval Mode" is set to "Prompt for consent"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -Value 2

# Ensure "User Account Control: Behavior of the elevation prompt for standard users" is set to "Automatically deny elevation requests"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorUser" -Value 0

# Ensure "User Account Control: Detect application installations and prompt for elevation" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableInstallerDetection" -Value 1

# Ensure "User Account Control: Only elevate UIAccess applications that are installed in secure locations" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableSecureUIAPaths" -Value 1

# Ensure "User Account Control: Only elevate executables that are signed and validated" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ValidateAdminCodeSignatures" -Value 1

# Ensure "User Account Control: Run all administrators in Admin Approval Mode" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -Value 1

# Ensure "User Account Control: Switch to the secure desktop when prompting for elevation" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "PromptOnSecureDesktop" -Value 1

# Ensure "Interactive logon: Message text for users attempting to log on" is configured

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "legalnoticetext" -Value "WARNING: Unauthorized access to this system is prohibited. All access and activity is subject to monitoring and recording."

# Ensure "Interactive logon: Message title for users attempting to log on" is configured

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "legalnoticecaption" -Value "Security Warning"

# Ensure "Accounts: Limit local account use of blank passwords to console logon only" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LimitBlankPasswordUse" -Value 1

# Ensure "Accounts: Rename administrator account" is configured

Rename-LocalUser -Name "Administrator" -NewName "SecureAdmin"

# Ensure "Accounts: Rename guest account" is configured

Rename-LocalUser -Name "Guest" -NewName "DisabledGuest"

# Ensure "Interactive logon: Do not display last user name" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "dontdisplaylastusername" -Value 1

# Ensure "Interactive logon: Do not require CTRL+ALT+DEL" is disabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableCAD" -Value 0

# Ensure "Microsoft network server: Amount of idle time required before suspending session" is set to 15 or fewer minutes, but not 0

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "AutoDisconnect" -Value 15

# Ensure "Microsoft network server: Digitally sign communications (always)" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "RequireSecuritySignature" -Value 1

# Ensure "Microsoft network server: Digitally sign communications (if client agrees)" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "EnableSecuritySignature" -Value 1

# Ensure "Microsoft network server: Disconnect clients when logon hours expire" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "EnableForcedLogOff" -Value 1

# Ensure "Microsoft network client: Send unencrypted password to third-party SMB servers" is disabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters" -Name "EnablePlainTextPassword" -Value 0

# Ensure "Network access: Allow anonymous SID/Name translation" is disabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "TurnOffAnonymousBlock" -Value 1

# Ensure "Network access: Do not allow anonymous enumeration of SAM accounts and shares" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "RestrictAnonymousSAM" -Value 1

# Ensure "Network access: Do not allow storage of passwords and credentials for network authentication" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "DisableDomainCreds" -Value 1

# Ensure "Network access: Let Everyone permissions apply to anonymous users" is disabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "EveryoneIncludesAnonymous" -Value 0

# Ensure "Network security: Allow Local System to use computer identity for NTLM" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "UseMachineId" -Value 1

# Ensure "Network security: Do not store LAN Manager hash value on next password change" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "NoLMHash" -Value 1

# Ensure "Network security: Force logoff when logon hours expire" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "ForceLogoffWhenHourExpire" -Value 1

# Ensure "Network security: LAN Manager authentication level" is set to "Send NTLMv2 response only. Refuse LM & NTLM"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LmCompatibilityLevel" -Value 5

# Ensure "Network security: LDAP client signing requirements" is set to "Negotiate signing"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LDAP" -Name "LDAPClientIntegrity" -Value 1

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) clients" is set to "Require NTLMv2 session security, Require 128-bit encryption"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "MinimumSecurityLevel" -Value 537395200

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) servers" is set to "Require NTLMv2 session security, Require 128-bit encryption"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "NTLMMinServerSec" -Value 537395200

# Ensure "Network security: Restrict NTLM: Add remote server exceptions for NTLM authentication" is configured with "wsman/*"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "MSV1_0\RestrictSendingNTLMInDomain" -Value "wsman/*"

# Ensure "System cryptography: Use FIPS compliant algorithms for encryption, hashing, and signing" is enforced

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\FIPSAlgorithmPolicy" -Name "Enabled" -Value 1

# Ensure "System objects: Require case insensitivity for non-Windows subsystems" is enabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel" -Name "ObCaseInsensitive" -Value 1

# Ensure "System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies" is enabled

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "AuthenticodeEnabled" -Value 1

# Ensure "Windows Defender Antivirus: Scan archive files" is enabled

Set-MpPreference -ScanArchive $true

# Ensure "Windows Defender Antivirus: Scan downloads and attachments" is enabled

Set-MpPreference -ScanDownloads $true

# Ensure "Windows Defender Antivirus: Scan incoming mail messages" is enabled

Set-MpPreference -ScanIncomingMail $true

# Ensure "Windows Defender Antivirus: Scan mapped network drives" is enabled
Set-MpPreference -DisableScanningMappedNetworkDrives $false

# Ensure "Windows Defender Antivirus: Scan removable drives" is enabled

Set-MpPreference -ScanRemovableDriveType 1

# Ensure "Windows Defender Antivirus: Turn off real-time protection" is disabled

Set-MpPreference -DisableRealtimeMonitoring $false

# Ensure "Windows Firewall: Allow inbound remote administration exception" is disabled

Set-NetFirewallRule -DisplayName "Remote Administration (RPC-EPMAP)" -Enabled False

# Ensure "Windows Firewall: Allow inbound Remote Desktop exceptions" is disabled

Set-NetFirewallRule -DisplayGroup "Remote Desktop" -Enabled False

# Ensure "Windows Firewall: Allow inbound file and printer sharing exception" is disabled

Set-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Enabled False

# Ensure "Windows Firewall: Allow inbound remote administration exception" is disabled (Domain)

Set-NetFirewallRule -DisplayName "Remote Administration (RPC-EPMAP-In)" -Enabled False -Profile Domain

# Ensure "Windows Firewall: Allow inbound remote desktop exceptions" is disabled (Domain)

Set-NetFirewallRule -DisplayGroup "Remote Desktop" -Enabled False -Profile Domain

# Ensure "Windows Firewall: Allow inbound file and printer sharing exception" is disabled (Domain)

Set-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Enabled False -Profile Domain

# Ensure "Windows Firewall: Allow inbound remote administration exception" is disabled (Public)

Set-NetFirewallRule -DisplayName "Remote Administration (RPC-EPMAP-In)" -Enabled False -Profile Public

# Ensure "Windows Firewall: Allow inbound remote desktop exceptions" is disabled (Public)

Set-NetFirewallRule -DisplayGroup "Remote Desktop" -Enabled False -Profile Public

# Ensure "Windows Firewall: Allow inbound file and printer sharing exception" is disabled (Public)

Set-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Enabled False -Profile Public

# Ensure "Windows Firewall: Allow inbound remote administration exception" is disabled (Private)

Set-NetFirewallRule -DisplayName "Remote Administration (RPC-EPMAP-In)" -Enabled False -Profile Private

# Ensure "Windows Firewall: Allow inbound remote desktop exceptions" is disabled (Private)

Set-NetFirewallRule -DisplayGroup "Remote Desktop" -Enabled False -Profile Private

# Ensure "Windows Firewall: Allow inbound file and printer sharing exception" is disabled (Private)

Set-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Enabled False -Profile Private

# Ensure "Windows Firewall: Allow ICMP exceptions" is disabled (Domain)

Set-NetFirewallRule -DisplayName "File and Printer Sharing (Echo Request - ICMPv4-In)" -Enabled False -Profile Domain

# Ensure "Windows Firewall: Allow ICMP exceptions" is disabled (Public)

Set-NetFirewallRule -DisplayName "File and Printer Sharing (Echo Request - ICMPv4-In)" -Enabled False -Profile Public

# Ensure "Windows Firewall: Allow ICMP exceptions" is disabled (Private)

Set-NetFirewallRule -DisplayName "File and Printer Sharing (Echo Request - ICMPv4-In)" -Enabled False -Profile Private

# Ensure "Windows PowerShell: Turn on Script Execution" is configured

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

### Ensure "Enable-PSRemoting" is configured

###Enable-PSRemoting -Force

# Ensure "Windows Remote Management (WinRM): Allow Basic authentication" is enabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Basic" -Value $true

# Ensure "Windows Remote Management (WinRM): Allow CredSSP authentication" is enabled

Set-Item -Path "WSMan:\localhost\Service\Auth\CredSSP" -Value $true

# Ensure "Windows Remote Management (WinRM): Allow Digest authentication" is enabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Digest" -Value $true

# Ensure "Windows Remote Management (WinRM): Allow Kerberos authentication" is enabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Kerberos" -Value $true

# Ensure "Windows Remote Management (WinRM): Allow Negotiate authentication" is enabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Negotiate" -Value $true

# Ensure "Windows Remote Management (WinRM): Allow unencrypted traffic" is disabled

Set-Item -Path "WSMan:\localhost\Service\AllowUnencrypted" -Value $false

# Ensure "Windows Remote Management (WinRM): Disallow WinRM from storing RunAs credentials" is enabled

Set-Item -Path "WSMan:\localhost\Service\DisableRunAs" -Value $true

# Ensure "Windows Remote Management (WinRM): Do not allow Basic authentication" is disabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Basic" -Value $false

# Ensure "Windows Remote Management (WinRM): Do not allow CredSSP authentication" is disabled

Set-Item -Path "WSMan:\localhost\Service\Auth\CredSSP" -Value $false

# Ensure "Windows Remote Management (WinRM): Do not allow Digest authentication" is disabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Digest" -Value $false

# Ensure "Windows Remote Management (WinRM): Do not allow Kerberos authentication" is disabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Kerberos" -Value $false

# Ensure "Windows Remote Management (WinRM): Do not allow Negotiate authentication" is disabled

Set-Item -Path "WSMan:\localhost\Service\Auth\Negotiate" -Value $false

# Ensure "Windows Remote Management (WinRM): Service Allow Remote Server management through WinRM" is enabled (Domain)

Set-Item -Path "WSMan:\localhost\Service\AllowRemoteServerManagement" -Value $true -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue Set-Item -Path "WSMan:\localhost\Service\AllowRemoteServerManagement" -Value $true -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "NT AUTHORITY\Authenticated Users"

# Ensure "Windows Remote Management (WinRM): Service Allow Remote Server management through WinRM" is enabled (Public)

Set-Item -Path "WSMan:\localhost\Service\AllowRemoteServerManagement" -Value $true -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "BUILTIN\Users"

# Ensure "Windows Remote Management (WinRM): Service IPv4 filter" is configured (Domain)

Set-Item -Path "WSMan:\localhost\Service\IPv4Filter" -Value "*" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "NT AUTHORITY\Authenticated Users"

# Ensure "Windows Remote Management (WinRM): Service IPv#6 filter" is configured (Public) Set-Item -Path "WSMan:\localhost\Service\IPv6Filter" -Value "*" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "BUILTIN\Users"

# Ensure "Windows Remote Management (WinRM): Service MaxConcurrentOperationsPerUser" is set to "5000"

Set-Item -Path "WSMan:\localhost\Service\MaxConcurrentOperationsPerUser" -Value 5000

# Ensure "Windows Remote Management (WinRM): Service MaxConcurrentOperationsPerUser" is set to "5000"

Set-Item -Path "WSMan:\localhost\Service\MaxConcurrentOperationsPerUser" -Value 5000

# Ensure "Windows Remote Management (WinRM): Service MaxConnections" is set to "25"

Set-Item -Path "WSMan:\localhost\Service\MaxConnections" -Value 25

# Ensure "Windows Remote Management (WinRM): Service MaxPacketRetrievalTimeSeconds" is set to "120"

Set-Item -Path "WSMan:\localhost\Service\MaxPacketRetrievalTimeSeconds" -Value 120

# Ensure "Windows Remote Management (WinRM): Service MaxShellRunTime" is set to "600"

Set-Item -Path "WSMan:\localhost\Service\MaxShellRunTime" -Value 600

# Ensure "Windows Remote Management (WinRM): Service MaxTimeoutmsForIdleConnection" is set to "180000"

Set-Item -Path "WSMan:\localhost\Service\MaxTimeoutmsForIdleConnection" -Value 180000

# Ensure "Windows Remote Management (WinRM): Service Plugin Restrict Remote Server Manager Compatibility" is enabled

Set-Item -Path "WSMan:\localhost\Service\Plugin\RestrictRemoteServerManagerCompatibility" -Value $true

# Ensure "Windows Remote Management (WinRM): Service RetryAttempts" is set to "5"

Set-Item -Path "WSMan:\localhost\Service\RetryAttempts" -Value 5

# Ensure "Windows Remote Management (WinRM): Service Shells Allowed" is configured (Domain)

Set-Item -Path "WSMan:\localhost\Service\Shells\AllowedShell" -Value "Microsoft.PowerShell" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "NT AUTHORITY\Authenticated Users" Set-Item -Path "WSMan:\localhost\Service\Shells\AllowedShell" -Value "Microsoft.PowerShell32" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "NT AUTHORITY\Authenticated Users"

# Ensure "Windows Remote Management (WinRM): Service Shells Allowed" is configured (Public)

Set-Item -Path "WSMan:\localhost\Service\Shells\AllowedShell" -Value "Microsoft.PowerShell" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "BUILTIN\Users" Set-Item -Path "WSMan:\localhost\Service\Shells\AllowedShell" -Value "Microsoft.PowerShell32" -Force -ea SilentlyContinue -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -Authentication AuthSDDL -User "BUILTIN\Users"

# #Ensure "Windows Remote Management (WinRM): Service TrustedHosts" is configured
# #Set-Item -Path "WSMan:\localhost\Service\AllowUnencrypted" -Value $false Set-Item -Path "WSMan:\localhost\Service\TrustedHosts" -Value "*" -Force -

# Ensure "Network security: Allow Local System to use computer identity for NTLM" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "UseMachineId" -Value 1 -Type DWord -Force

# Ensure "Network security: Allow LocalSystem NULL session fallback" is disabled

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "AllowNullSessCredentials" -Value 0 -Type DWord -Force

# Ensure "Network security: Allow PKU2U authentication requests to this computer to use online identities" is disabled

Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Lsa\pku2u" -Name "AllowOnlineID" -Value 0 -Type DWord -Force

# Ensure "Network security: Configure encryption types allowed for Kerberos" is set to "AES128_HMAC_SHA1, AES256_HMAC_SHA1, Future encryption types"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\Kerberos\Parameters" -Name "SupportedEncryptionTypes" -Value 2147483644 -Type DWord -Force

# Ensure "Network security: Do not store LAN Manager hash value on next password change" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "NoLMHash" -Value 1 -Type DWord -Force

# Ensure "Network security: Force logoff when logon hours expire" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "ForceLogoffWhenHourExpire" -Value 1 -Type DWord -Force

# Ensure "Network security: LAN Manager authentication level" is set to "Send NTLMv2 response only. Refuse LM & NTLM"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LmCompatibilityLevel" -Value 5 -Type DWord -Force

# Ensure "Network security: LDAP client signing requirements" is set to "Negotiate signing"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LDAP" -Name "LDAPClientIntegrity" -Value 1 -Type DWord -Force

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) clients" is set to "Require NTLMv2 session security, Require 128-bit encryption"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "NTLMMinClientSec" -Value 537395200 -Type DWord -Force

# Ensure "Network security: Minimum session security for NTLM SSP based (including secure RPC) servers" is set to "Require NTLMv2 session security, Require 128-bit encryption"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "NTLMMinServerSec" -Value 537395200 -Type DWord -Force

# Ensure "Network security: Restrict NTLM: Add remote server exceptions for NTLM authentication" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0" -Name "RestrictSendingNTLMTraffic"

Ensure "MSS: (AutoAdminLogon) Enable Automatic Logon (not recommended)" is disabled
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "AutoAdminLogon" -Value 0 -Type DWord -Force

Ensure "MSS: (DisableIPSourceRouting) IP source routing protection level (protects against packet spoofing)" is set to "Highest protection, source routing is completely disabled"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "DisableIPSourceRouting" -Value 2 -Type DWord -Force

Ensure "MSS: (EnableICMPRedirect) Allow ICMP redirects to override OSPF generated routes" is disabled
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "EnableICMPRedirect" -Value 0 -Type DWord -Force

Ensure "MSS: (KeepAliveTime) How often keep-alive packets are sent in milliseconds" is set to "300,000 or 5 minutes (recommended)"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "KeepAliveTime" -Value 300000 -Type DWord -Force

Ensure "MSS: (NoDefaultExe) Do not allow executables to run unless they meet a prevalence check criteria" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "AuthenticodeEnabled" -Value 0 -Type DWord -Force

Ensure "MSS: (SafeDllSearchMode) Enable Safe DLL search mode (recommended)" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name "SafeDllSearchMode" -Value 1 -Type DWord -Force

Ensure "MSS: (ScreenSaverGracePeriod) The time in seconds before the screen saver grace period expires (0 recommended)" is set to "Not Configured"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Control Panel\Desktop" -Name "ScreenSaverGracePeriod" -Value 0 -Type DWord -Force

Ensure "MSS: (TcpMaxDataRetransmissions IPv4) How many times unacknowledged data is retransmitted" is set to "3"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpMaxDataRetransmissions" -Value 3 -Type DWord -Force

Ensure "MSS: (TcpMaxDataRetransmissions IPv6) How many times unacknowledged data is retransmitted" is set to "3"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" -Name "TcpMaxDataRetransmissions" -Value 3 -Type DWord -Force

Ensure "MSS: (WarningLevel) Percentage threshold for the security event log at which the system will generate a warning" is set to "90%"
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Eventlog\Security" -Name "WarningLevel" -Value 90 -Type DWord -Force

###Ensure "MSS: (Turn off Data Execution Prevention for Explorer) - Disable" is set to "Disabled"
###Set-ItemProperty -Path "HKLM

Ensure "MSS: (AutoRun) Allow Windows to Run Startu" is disabled
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoAutorun" -Value 1 -Type DWord -Force

Ensure "MSS: (CachedLogonsCount) Number of previous logons to cache (in case domain controller is not available)" is set to "4" or less
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "CachedLogonsCount" -Value 4 -Type DWord -Force

Ensure "MSS: (DisableCAD) Remove CAD (Ctrl+Alt+Delete) sequence" is set to "Disabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableCAD" -Value 0 -Type DWord -Force

Ensure "MSS: (Do not display the password reveal button)" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CredUI" -Name "DisablePasswordReveal" -Value 1 -Type DWord -Force

Ensure "MSS: (EnableScreenSaver) Enable Screen Saver" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Control Panel\Desktop" -Name "ScreenSaverIsSecure" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Control Panel\Desktop" -Name "ScreenSaveActive" -Value 1 -Type DWord -Force

Ensure "MSS: (Hide entry points for Fast User Switching) - Enabled" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "HideFastUserSwitching" -Value 1 -Type DWord -Force

Ensure "MSS: (Interactive logon: Do not display last user name) - Enabled" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DontDisplayLastUserName" -Value 1 -Type DWord -Force

Ensure "MSS: (Microsoft Support Diagnostic Tool) Turn on MSDT interactive communication with support provider" is set to "Disabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\ScriptedDiagnosticsProvider\Policy" -Name "DisableQueryRemoteServer" -Value 1 -Type DWord -Force

Ensure "MSS: (Prevent a forgotten password) - Disabled" is set to "Disabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DisableCAD" -Value 0 -Type DWord -Force

Ensure "MSS: (Prevent Edge from running in Windows 10) - Enabled" is set to "Enabled"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main" -Name "AllowInPrivate" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main" -Name "DisablePrivateBrowsing" -Value 1 -Type DWord -Force

###Ensure "MSS: (Screen Saver executable name) - Disabled" is

# Ensure "MSS: (Prevent installation of devices that match any of these device instance IDs) - Not Configured" is set to "Not Configured"

Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Restrictions" -Name "DenyDeviceIDs" -Force

# Ensure "MSS: (Prevent installation of devices that match any of these hardware IDs) - Not Configured" is set to "Not Configured"

Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Restrictions" -Name "DenyHardwareIDs" -Force

# Ensure "MSS: (Prevent non-administrators from installing printer drivers) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers" -Name "KMPrintersSecurity" -Value 1 -Type DWord -Force

# Ensure "MSS: (Prevent users from installing printer drivers) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers" -Name "KMPrintersSecurity" -Value 2 -Type DWord -Force

# Ensure "MSS: (Prevent users from installing updates) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "DisableOSUpgrade" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "DisableWindowsUpdateAccess" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "ElevateNonAdmins" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "NoAutoUpdate" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AUOptions" -Value 2 -Type DWord -Force

# Ensure "MSS: (Specify intranet Microsoft update service location) - Disabled" is set to "Disabled"

Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "WUServer" -Force Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "WUStatusServer" -Force

# Ensure "MSS: (Turn off handwriting personalization data sharing) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC" -Name "PreventHandwritingDataSharing" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn off Internet Connection Wizard if URL connection is referring to Microsoft.com) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Internet Connection Wizard" -Name "ExitOnMSICW" -Value 1 -Type DWord -Force

###Ensure "MSS: (

# Ensure "MSS: (Turn off the advertising ID) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" -Name "DisabledByGroupPolicy" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn off the offer to update to the latest version of Windows) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "DisableOSUpgrade" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn off Windows Customer Experience Improvement Program) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows" -Name "CEIPEnable" -Value 0 -Type DWord -Force

# Ensure "MSS: (Turn off Windows Error Reporting) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "Disabled" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn off Windows Error Reporting) - Enabled: Force generic reporting" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "DontSendAdditionalData" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "ForceQueue" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "MaxQueueCount" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "QueuePesterInterval" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "QueuePesterThrottle" -Value 0 -Type DWord -Force

# Ensure "MSS: (Turn off Windows Error Reporting) - Enabled: No reporting" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "NoReportQueue" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn on recommended software notifications) - Disabled" is set to "Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting" -Name "DisableSendingAllData" -Value 1 -Type DWord -Force

# Ensure "MSS: (Turn on Windows Customer Experience Improvement Program) - Disabled" is set to "Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows" -Name "CEIPEnable" -Value 0 -Type DWord -Force

# Ensure "MSS: (Turn on Windows Defender Antivirus review) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Reporting" -Name "DisableEnhancedNotifications" -Value 0 -Type DWord -Force

###Ensure "MSS: (Allow Telemetry) - Disabled" is set to "Disabled"
###Set-ItemProperty -Path "HKLM

# Ensure "MSS: (Windows Defender Antivirus SmartScreen) - Warn and prevent bypass" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "EnableSmartScreen" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Application Guard Companion) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WDAGUtilityAccount" -Name "WDAGUtilityAccountEnabled" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard Network Protection) - Prevent users and apps from accessing dangerous websites from Microsoft Edge and Internet Explorer" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection" -Name "EnableNetworkProtection" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection" -Name "AuditMode" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\CloudBlockLevel" -Name "Policy" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\CloudBlockLevel" -Name "UserOverride" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\ExecutableTypes" -Name "Policy" -Value 3 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\ExecutableTypes" -Name "UserOverride" -Value 0 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard Network Protection) - Prevent users and apps from accessing dangerous websites from other browsers" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection" -Name "EnableNetworkProtection" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection" -Name "AuditMode" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\CloudBlockLevel" -Name "Policy" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\CloudBlockLevel" -Name "UserOverride" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\ExecutableTypes" -Name "Policy" -Value 3 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\NetworkProtection\ExecutableTypes" -Name "UserOverride" -Value 0 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard Network Protection) - Prevent users and apps from opening untrusted and potentially malicious files from the Internet" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Policy" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "UserOverride" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "SecurityHKLMonly" -Value 1 -Type DWord -Force New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value1" -Value "%AppData%*.exe" -Type String -Force | Out-Null New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value2" -Value "%AppData%**.exe" -Type String -Force | Out-Null New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value3" -Value "%LOCALAPPDATA%*.exe" -Type String -Force | Out-Null New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value4" -Value "%LOCALAPPDATA%**.exe" -Type String -Force | Out-Null New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value5" -Value "%ProgramFiles%**.exe" -Type String -Force | Out-Null New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\RestrictedPaths" -Name "Value6" -Value "%ProgramFiles(x86)%**.exe" -Type String -Force | Out-Null

# Ensure "MSS: (Windows Defender Exploit Guard Network Protection) - Prevent users and apps from opening files from outside of the Windows Store" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\Win32Restrictions" -Name "EnableWin32LaunchRestriction" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\Win32Restrictions" -Name "UserOverride" -Value 0 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Control Flow Guard for all apps" is set to "Enabled: On by default"

###Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows ### Defender\ExploitGuard\ControlFlowGuard" -Name "EnableControlFlowGuard" -Value 1 -Type ###DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\ControlFlowGuard" -Name "EnableExportSuppression" -Value 1 -Type ###DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\ControlFlowGuard" -Name "Strict

# nsure "MSS: (Windows Defender Exploit Guard) - Control Flow Guard for Microsoft Edge" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\ControlFlowGuard" -Name "EnableEdgeMode" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Control Flow Guard for kernel mode" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\ControlFlowGuard" -Name "KernelControlFlowGuardEnabled" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Control Flow Guard for system calls" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\ExploitGuard\ControlFlowGuard" -Name "SystemControlFlowGuardEnabled" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Randomize memory allocations (Bottom-Up ASLR)" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "BottomUpASLR" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Randomize memory allocations for 32-bit binaries" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "MoveImages" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Randomize memory allocations (Top-Down ASLR)" is set to "Enabled: On by default"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "TopDownASLR" -Value 1 -Type DWord -Force

# Ensure "MSS: (Windows Defender Exploit Guard) - Use a separate process for 32-bit Internet Explorer" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Internet Explorer\Main" -Name "TabProcGrowth" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "AuthenticodeEnabled" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Level of certificate verification" is set to "No list. (Do not use certificate rules)"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "AuthenticodeEnabled" -Value 0 -Type DWord -Force

# Ensure "MSS: (System settings: Use UNC paths in RemoteApp and Desktop Connections) - Disabled" is set to "Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services" -Name "UseUNC" -Value 0 -Type DWord -Force

# Ensure "MSS: (System settings: Use UNC paths in RemoteApp and Desktop Connections) - Disabled" is set to "Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services" -Name "UseUNC" -Value 0 -Type DWord -Force

# Ensure "MSS: (System settings: Block user from showing account details on sign-in) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "BlockUserFromShowingAccountDetailsOnSignin" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Require a message for users attempting to log on) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "legalnoticecaption" -Value "WARNING!" -Type String -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "legalnoticetext" -Value "This system is for authorized use only. Individuals using this computer system without authority, or in excess of their authority, are subject to having all of their activities on this system monitored and recorded by system personnel. In the course of monitoring individuals improperly using this system, or in the course of system maintenance, the activities of authorized users may also be monitored. Anyone using this system expressly consents to such monitoring and is advised that if such monitoring reveals possible evidence of criminal activity, system personnel may provide the evidence of such monitoring to law enforcement officials. " -Type String -Force

# Ensure "MSS: (System settings: Turn off automatic root certificate update) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\SystemCertificates\AuthRoot" -Name "DisableRootAutoUpdate" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent users from sharing files within their profile." is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperience" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperienceK" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent access to the command prompt) - Enabled: Disabled" is set to "Enabled: Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "DisableCMD" -Value 0 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Enforce certificate rules" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "EnforceCertificateRules" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent users from sharing files within their profile." is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperience" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperienceK" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent access to the command prompt) - Enabled: Disabled" is set to "Enabled: Disabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "DisableCMD" -Value 0 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Enforce certificate rules" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "EnforceCertificateRules" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent users from installing printer drivers) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers" -Name "KDisallowUserPrintDrivers" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Restrict CD-ROM access to locally logged-on user only) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Cdrom" -Name "Autorun" -Value 0 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Cdrom" -Name "DisableAutorun" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Create a default deny" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "DefaultLevel" -Value 262144 -Type DWord -Force

# Ensure "MSS: (System settings: Restrict CD-ROM access to locally logged-on user only) - Enabled" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Cdrom" -Name "Start" -Value 4 -Type DWord -Force

# Ensure "MSS: (System settings: Prevent users from sharing files within their profile." is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperience" -Value 1 -Type DWord -Force Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableIndexedLibraryExperienceK" -Value 1 -Type DWord -Force

# Ensure "MSS: (System settings: Use Certificate Rules on Windows Executables for Software Restriction Policies) - Create a default deny" is set to "Enabled"

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" -Name "DefaultLevel" -Value 262144 -Type DWord -Force




```
