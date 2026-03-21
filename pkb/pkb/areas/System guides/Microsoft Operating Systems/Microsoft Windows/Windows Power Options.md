
```js
# Adding Power Options

# Add or Remove "Maximum processor state" in Power Options using Command Prompt

# Source: https://www.tenforums.com/tutorials/107967-add-remove-maximum-processor-state-power-options-windows.html#option1
# Add Registry Entry

# Open Command Prompt (Admin)

C:\> REG ADD HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\bc5038f7-23e0-4960-96da-33abaf5935ec /v Attributes /t REG_DWORD /d 2 /f

# Set PlatformAoAcOverride to 0

C:\> REG ADD HKLM\System\CurrentControlSet\Control\Power /v PlatformAoAcOverride /t REG_DWORD /d 0
```

# Using the PowerCFG command

```js
C:\Windows\system32>powercfg /?

POWERCFG /COMMAND [ARGUMENTS]

Description:
  Enables users to control power settings on a local system.

  For detailed command and option information, run "POWERCFG /? <COMMAND>"

Command List:
  /LIST, /L         		Lists all power schemes.
  /QUERY, /Q         		Displays the contents of a power scheme.
  /CHANGE, /X        		Modifies a setting value in the current power scheme.
  /CHANGENAME        		Modifies the name and description of a power scheme.
  /DUPLICATESCHEME   		Duplicates a power scheme.
  /DELETE, /D       		 Deletes a power scheme.
  /DELETESETTING     		Deletes a power setting.
  /SETACTIVE, /S     		Makes a power scheme active on the system.
  /GETACTIVESCHEME   		Retrieves the currently active power scheme.
  /SETACVALUEINDEX   		Sets the value associated with a power setting
	                        while the system is powered by AC power.
  
  /SETDCVALUEINDEX  		Sets the value associated with a power setting
                     		while the system is powered by DC power.
  
  /IMPORT          			Imports all power settings from a file.
  /EXPORT           		Exports a power scheme to a file.
  /ALIASES           		Displays all aliases and their corresponding GUIDs.
  /GETSECURITYDESCRIPTOR	Gets a security descriptor associated with a specified
			                power setting, power scheme, or action.
  
  /SETSECURITYDESCRIPTOR    Sets a security descriptor associated with a
							power setting, power scheme, or action.
  
  /HIBERNATE, /H    		Enables and disables the hibernate feature.
  /AVAILABLESLEEPSTATES, /A	Reports the sleep states available on the system.
  /DEVICEQUERY       		Returns a list of devices that meet specified criteria.
  /DEVICEENABLEWAKE         Enables a device to wake the system from a sleep state.
  /DEVICEDISABLEWAKE        Disables a device from waking the system from a sleep
                   			state.
  
  /LASTWAKE          		Reports information about what woke the system from the
                     		last sleep transition.
  
  /WAKETIMERS        		Enumerates active wake timers.
  /REQUESTS          		Enumerates application and driver Power Requests.
  /REQUESTSOVERRIDE  		Sets a Power Request override for a particular Process,
                     		Service, or Driver.
  
  /ENERGY           		Analyzes the system for common energy-efficiency and
                    		battery life problems.
  
  /BATTERYREPORT     		Generates a report of battery usage.

  /SLEEPSTUDY        		Generates a diagnostic system power transition report.
  /SRUMUTIL          		Dumps Energy Estimation data from System Resource Usage
                     		Monitor (SRUM).

  /SYSTEMSLEEPDIAGNOSTICS   Generates a diagnostic report of system sleep transitions.

  /SYSTEMPOWERREPORT 	    Generates a diagnostic system power transition report.
  /POWERTHROTTLING   		Control power throttling for an application.
  
```