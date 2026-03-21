# Intermediate CA Setup Guide

## Overview
This guide sets up the online Intermediate Certificate Authority (CA). It requires the signed intermediate certificate from the root CA.

## Steps

1. Transfer these files from the root CA:
   - `intermediate-ca.key`
   - `intermediate-ca.crt`

2. Place them in:
```
/etc/pki/certforge/intermediate/private/intermediate-ca.key
/etc/pki/certforge/intermediate/certs/intermediate-ca.crt
```

3. Run the deployment script:

```bash
cd certforge/intermediate-ca
chmod +x deploy-intermediate.sh
./deploy-intermediate.sh
```

4. Verify portal availability:
- Backend: http://localhost:5000
- Portal: http://localhost:8080
