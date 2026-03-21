
# SLMGR 

```js
Options:

/ipk <Product Key> # Install product key (replaces existing key)
/ato [Activation ID] # Activate Windows
/dli [Activation ID] # Display current license
/dlv [Activation ID | all] # Dislay detailed license information
/xpr [Activation ID] Expiration date for current license state

/rearm # Reset the licensing status of the machine
/upk [Activation ID]  # Uninstall product key
/dti [Activation ID]  # Display installation ID for offline activation
/atp <Confirmation ID> [Activation ID]
```

# Remove Current Product Key
```js
[ADMIN] PS C:\> slmgr /upk
```

# Install product key
```js
[ADMIN] PS C:\> slmgr /ipk 6GHKN-R77DV-FVGPM-9TPG6-4M48R
[ADMIN] PS C:\> slmgr /ipk KK2V6-47N6T - K6H48-3V8V6 - 3V66T

```

# Activate product key
```js
# Activate product key
[ADMIN] PS C:\> slmgr /ato
```

# Activate by Phone (not working)
```
# If Activate by Phone doesn't work in GUI
[ADMIN] PS C:\> slui.exe 4

```