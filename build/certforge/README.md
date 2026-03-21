# CertForge - Dockerized PKI Infrastructure

Complete offline/online CA infrastructure with web management portal.

## Architecture

```
┌─────────────────────────────────────────┐
│  React Admin Portal                     │
│  (http://localhost:3000)                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Flask API Orchestrator                 │
│  (http://localhost:5000)                │
│  - Docker API client                    │
│  - Certificate management               │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼───────┐           ┌──────▼───────┐
│ root-ca   │           │ intermediate │
│ container │           │ container    │
│ (offline) │           │ (online)     │
│ Port: N/A │           │ Port: 5001   │
└───────────┘           └──────────────┘
```

## Quick Start

### 1. Build and Start Containers

```bash
cd /home/localadmin/.openclaw/workspace/certforge

# Build all images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Setup Root CA (One-time, offline)

```bash
# Enter root CA container
docker exec -it certforge-root-ca bash

# Run setup script (offline key generation)
./setup-root-ca.sh

# Exit
exit
```

### 3. Deploy Intermediate CA

```bash
# Enter intermediate CA container
docker exec -it certforge-intermediate-ca bash

# Deploy intermediate CA
./deploy-intermediate.sh

# Exit
exit
```

### 4. Access Admin Portal

```bash
# Start React dev server
cd admin-portal
npm install
npm start

# Open browser
# http://localhost:3000
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Container Management
```
GET    /api/containers              # List all containers
POST   /api/containers/:name/start  # Start container
POST   /api/containers/:name/stop   # Stop container
POST   /api/containers/:name/restart# Restart container
GET    /api/containers/:name/logs   # Get container logs
```

### Certificate Management
```
GET  /api/certs                    # List issued certificates
GET  /api/certs/:cert_name         # Download certificate
GET  /api/crl                      # Download CRL
POST /api/intermediate/issue       # Request certificate issuance
```

## Security Features

- **Root CA Container**: No network access, manual execution only
- **Intermediate CA Container**: Network restricted to Flask port
- **Non-root users**: Both containers run as `certforge` user
- **Capability dropping**: ALL capabilities dropped
- **Volume isolation**: Separate volumes for root and intermediate data

## Directory Structure

```
certforge/
├── api/
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
├── root-ca/
│   ├── Dockerfile
│   ├── setup-root-ca.sh
│   └── config/
├── intermediate-ca/
│   ├── Dockerfile
│   ├── deploy-intermediate.sh
│   ├── config/
│   └── backend/
│       ├── app.py
│       ├── requirements.txt
│       └── db/
├── admin-portal/
│   ├── public/
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Troubleshooting

### Containers won't start
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Restart Docker daemon
sudo systemctl restart docker
```

### Certificate issuance fails
```bash
# Check intermediate CA logs
docker logs certforge-intermediate-ca

# Verify intermediate CA files exist
docker exec certforge-intermediate-ca ls -la /opt/certforge/intermediate-ca/certs/
```

### Admin portal won't connect
```bash
# Verify API is running
curl http://localhost:5000/api/health

# Check API logs
docker logs certforge-api
```

## Next Steps

1. ✅ Docker containerization complete
2. 🔄 Wire in authentication (JWT-based)
3. 🔄 Add access control lists (ACL)
4. 🔄 Add OCSP responder
5. 🔄 Create React cert request form
6. 🔄 Add monitoring and alerts

---

**Built by Sam** 🧑‍💼
