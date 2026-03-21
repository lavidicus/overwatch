
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
```

# Activate product key
```js
# Activate product key
[ADMIN] PS C:\> slmgr /ato
```
WMDGN-G9PQG-XVVXX-R3X43-63DFG