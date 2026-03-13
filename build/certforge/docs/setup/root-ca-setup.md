# Root CA Setup Guide

## Overview
This guide sets up the offline Root Certificate Authority (CA). **This machine must be air-gapped.**

## Steps

1. Copy the `certforge/root-ca/` folder to an offline machine.
2. Run the setup script:

```bash
cd certforge/root-ca
chmod +x setup-root-ca.sh
./setup-root-ca.sh
```

3. Store the following securely:
- `root-ca.key` (private key)
- `root-ca.crt` (root certificate)
- `root-ca.crl` (certificate revocation list)

4. Transfer the intermediate CSR to the root CA machine for signing.
