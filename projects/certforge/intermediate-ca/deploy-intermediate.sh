#!/bin/bash
# CertForge Intermediate CA Deployment Script
# Deploys the intermediate CA and public portal

set -e

echo "🔨 CertForge - Intermediate CA Deployment"
echo "======================================="

# Configuration
CERTFORGE_INTERMEDIATE="/etc/pki/certforge/intermediate"

# Create directory structure
mkdir -p "${CERTFORGE_INTERMEDIATE}"/{certs,crl,newcerts,private,csr,issued}
chmod 700 "${CERTFORGE_INTERMEDIATE}/private"
touch "${CERTFORGE_INTERMEDIATE}/index.txt"
echo 1000 > "${CERTFORGE_INTERMEDIATE}/serial"
echo 1000 > "${CERTFORGE_INTERMEDIATE}/crlnumber"

# Copy config
cp config/intermediate-ca.conf "${CERTFORGE_INTERMEDIATE}/intermediate-ca.conf"

# Check for intermediate cert and key
if [ ! -f "${CERTFORGE_INTERMEDIATE}/private/intermediate-ca.key" ]; then
    echo "❌ Missing intermediate-ca.key in ${CERTFORGE_INTERMEDIATE}/private"
    echo "   Please transfer signed intermediate certificate and key from root CA"
    exit 1
fi

if [ ! -f "${CERTFORGE_INTERMEDIATE}/certs/intermediate-ca.crt" ]; then
    echo "❌ Missing intermediate-ca.crt in ${CERTFORGE_INTERMEDIATE}/certs"
    echo "   Please transfer signed intermediate certificate from root CA"
    exit 1
fi

# Generate CRL
openssl ca -config "${CERTFORGE_INTERMEDIATE}/intermediate-ca.conf" \
    -gencrl -out "${CERTFORGE_INTERMEDIATE}/crl/intermediate-ca.crl"

# Start backend
cd backend
pip install -r requirements.txt
python app.py &

# Start web server
cd ..
python -m http.server 8080 --directory web/public &

echo "✅ CertForge Intermediate CA deployed"
echo "   Backend: http://localhost:5000"
echo "   Portal: http://localhost:8080"
