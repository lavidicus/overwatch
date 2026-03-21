```js
Computer\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform

Open the command prompt with administrative privilege.
Type ‘slmgr.vbs -rearm‘ in command windows and hit Enter


Type Win+R, type Regedit to open Registry Editor.
Navigate to HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform
In the right section find out the ‘SkipRearm‘ dword 32-bit key and change its value to ‘1’ from ‘0’.
Press ‘Ok’ and you are done. Now, you can reset the Windows OS trial period eight more times.


slmgr.vbs -rearm HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform
```

