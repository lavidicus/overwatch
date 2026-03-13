#!/bin/bash
# CertForge Root CA Setup Script
# This script creates the offline root CA infrastructure
# RUN THIS ON AN OFFLINE/AIR-GAPPED MACHINE ONLY!

set -e

echo "🔨 CertForge - Root CA Setup"
echo "=============================="
echo ""

# Configuration
CERTFORGE_ROOT="/etc/pki/certforge"
ROOT_KEY_SIZE=4096
ROOT_VALIDITY_DAYS=7300  # 20 years
INTERMEDIATE_VALIDITY_DAYS=3650  # 10 years

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Warning check
echo -e "${YELLOW}⚠️  WARNING: This will configure the Root CA on THIS machine.${NC}"
echo -e "${YELLOW}⚠️  Ensure this machine is AIR-GAPPED (no network access).${NC}"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Setup cancelled."
    exit 1
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "${CERTFORGE_ROOT}"/{certs,crl,newcerts,private,config}
chmod 700 "${CERTFORGE_ROOT}/private"
touch "${CERTFORGE_ROOT}/index.txt"
echo 1000 > "${CERTFORGE_ROOT}/serial"
echo 1000 > "${CERTFORGE_ROOT}/crlnumber"
chmod 644 "${CERTFORGE_ROOT}/index.txt"

# Copy OpenSSL config
cp config/root-ca.conf "${CERTFORGE_ROOT}/"
cp config/root-ca-intermediate.conf "${CERTFORGE_ROOT}/"

echo -e "${GREEN}✅ Directory structure created${NC}"

# Generate Root Private Key
echo "🔑 Generating Root Private Key (${ROOT_KEY_SIZE}-bit RSA)..."
openssl genpkey -algorithm RSA \
    -pkeyopt rsa_keysize:${ROOT_KEY_SIZE} \
    -out "${CERTFORGE_ROOT}/private/root-ca.key" \
    -aes256 \
    -passout pass:CHANGE_THIS_PASSWORD

chmod 600 "${CERTFORGE_ROOT}/private/root-ca.key"
echo -e "${GREEN}✅ Root private key generated${NC}"

# Generate Root Certificate
echo "📜 Generating Root Certificate..."
openssl req -x509 -new -nodes \
    -key "${CERTFORGE_ROOT}/private/root-ca.key" \
    -sha384 -days ${ROOT_VALIDITY_DAYS} \
    -out "${CERTFORGE_ROOT}/certs/root-ca.crt" \
    -subj "/C=US/ST=California/L=San Francisco/O=Your Organization/OU=IT Security/CN=Your Organization Root CA" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:1" \
    -addext "subjectKeyIdentifier=hash"

echo -e "${GREEN}✅ Root certificate generated (valid for 20 years)${NC}"

# Generate CRL
echo "🔄 Generating initial CRL..."
openssl ca -config "${CERTFORGE_ROOT}/root-ca.conf" \
    -gencrl -out "${CERTFORGE_ROOT}/crl/root-ca.crl"

echo -e "${GREEN}✅ Initial CRL generated${NC}"

# Backup root key
echo "💾 Creating encrypted backup of root key..."
BACKUP_DIR="${CERTFORGE_ROOT}/backup"
mkdir -p "${BACKUP_DIR}"
tar -czf "${BACKUP_DIR}/root-ca-backup.tar.gz" \
    -C "${CERTFORGE_ROOT}/private" root-ca.key \
    -C "${CERTFORGE_ROOT}/certs" root-ca.crt
openssl enc -aes-256-cbc -salt \
    -in "${BACKUP_DIR}/root-ca-backup.tar.gz" \
    -out "${BACKUP_DIR}/root-ca-backup.tar.gz.enc" \
    -pass pass:CHANGE_THIS_BACKUP_PASSWORD
chmod 600 "${BACKUP_DIR}/root-ca-backup.tar.gz.enc"

echo -e "${GREEN}✅ Root key backup created (encrypted)${NC}"

# Generate Intermediate CA CSR (for signing by root)
echo "📝 Generating Intermediate CA CSR..."
INTERMEDIATE_DIR="/tmp/certforge-intermediate"
mkdir -p "${INTERMEDIATE_DIR}"

openssl genpkey -algorithm RSA \
    -pkeyopt rsa_keysize:2048 \
    -out "${INTERMEDIATE_DIR}/intermediate-ca.key" \
    -aes256 \
    -passout pass:CHANGE_THIS_PASSWORD

openssl req -new -key "${INTERMEDIATE_DIR}/intermediate-ca.key" \
    -out "${INTERMEDIATE_DIR}/intermediate-ca.csr" \
    -subj "/C=US/ST=California/L=San Francisco/O=Your Organization/OU=IT Security/CN=Your Organization Intermediate CA"

echo -e "${GREEN}✅ Intermediate CA CSR generated${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Transfer these files to the online intermediate server:"
echo "      - ${INTERMEDIATE_DIR}/intermediate-ca.key"
echo "      - ${INTERMEDIATE_DIR}/intermediate-ca.csr"
echo "   2. Sign the CSR with the root CA (see intermediate CA setup)"
echo "   3. Distribute root-ca.crt to all trusted clients"
echo ""
echo -e "${GREEN}✅ Root CA setup complete!${NC}"
echo ""
echo -e "${YELLOW}⚠️  SECURITY REMINDER:${NC}"
echo "   - Change all passwords in the configuration"
echo "   - Store backup in secure location"
echo "   - Keep this machine offline (air-gapped)"
echo "   - Never expose root-ca.key to network"
