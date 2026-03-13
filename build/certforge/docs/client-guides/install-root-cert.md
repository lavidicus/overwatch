# Install Root Certificate

## Linux (Ubuntu/Debian)
```bash
sudo cp root-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## macOS
1. Open **Keychain Access**
2. Import `root-ca.crt`
3. Set as **Always Trust**

## Windows
1. Run `certmgr.msc`
2. Import `root-ca.crt` into **Trusted Root Certification Authorities**
