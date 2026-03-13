# CertForge - Certificate Authority Infrastructure
**Version:** 1.0.0  
**Date:** 2026-03-13

## Overview

CertForge is a complete PKI Certificate Authority system with:
- **Offline Root CA** (4096-bit RSA, air-gapped)
- **Online Intermediate CA** (2048/4096-bit RSA, public-facing)
- **Public Validation Portal** (certificate lookup, CRL, validation)

## Quick Start

### 1. Initial Setup (Root CA - Offline)

```bash
# Go to root-ca directory
cd /home/localadmin/.openclaw/workspace/certforge/root-ca

# Run initial setup script (requires offline machine)
./setup-root-ca.sh
```

### 2. Deploy Intermediate CA

```bash
# Go to intermediate-ca directory
cd /home/localadmin/.openclaw/workspace/certforge/intermediate-ca

# Deploy to public server
./deploy-intermediate.sh
```

### 3. Start Public Portal

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run server
python app.py
```

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   OFFLINE ROOT CA   │     │  ONLINE INTERMEDIATE│
│   (Air-gapped)      │────▶│     CA (Online)     │
│   4096-bit RSA      │     │   2048/4096-bit     │
│   20-year validity  │     │   10-year validity  │
└─────────────────────┘     └─────────┬───────────┘
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │  PUBLIC PORTAL      │
                          │  pki.9xc.io         │
                          │  - Certificate lookup│
                          │  - CRL distribution  │
                          │  - OCSP responder    │
                          └─────────────────────┘
```

## Key Features

- ✅ Offline root CA with air-gapped security
- ✅ Configurable certificate key sizes (2048/4096 bits)
- ✅ Public validation portal with real-time lookup
- ✅ CRL (Certificate Revocation List) distribution
- ✅ OCSP responder for real-time validation
- ✅ PostgreSQL certificate database
- ✅ Audit logging for all operations
- ✅ Single-use download links for certificates

## Security Model

1. **Root CA**: Never touches the internet, stored offline
2. **Intermediate CA**: Public-facing, signs leaf certificates
3. **Leaf Certificates**: User-requested, signed by intermediate

## Documentation

- [Setup Guide](docs/setup/root-ca-setup.md)
- [API Reference](docs/api/portal-api.md)
- [Client Guide](docs/client-guides/install-root-cert.md)

## License

Proprietary - Internal Use Only

---

**Built with:** Python, PostgreSQL, React, OpenSSL
**Author:** Sam (🧑‍💼)
