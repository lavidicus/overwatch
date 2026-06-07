# Overwatch Deployment Guide

Production deployment instructions for the Overwatch platform.

## 📋 Production Checklist

Before deploying to production, ensure:

- [ ] PostgreSQL 14+ installed and configured
- [ ] Redis 6.2+ installed and running
- [ ] Node.js 20+ installed on all application servers
- [ ] SSL/TLS certificates obtained and configured
- [ ] Firewall rules configured (ports 3000, 5432, 6379)
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Environment variables secured (`.env` files or secret manager)

---

## 🗄️ Database Setup (PostgreSQL)

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE overwatch;
CREATE USER overwatch_user WITH PASSWORD 'generate-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE overwatch TO overwatch_user;
\c overwatch
GRANT ALL ON SCHEMA public TO overwatch_user;
\q
```

### 3. Configure PostgreSQL

Edit `/etc/postgresql/14/main/postgresql.conf`:
```ini
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
work_mem = 8MB
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:
```conf
# Local connections
local   overwatch   overwatch_user                      md5
# IPv4 local connections
host    overwatch   overwatch_user  127.0.0.1/32        md5
# IPv6 local connections
host    overwatch   overwatch_user  ::1/128             md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4. Run Migrations

```bash
cd backend
DATABASE_URL="postgresql://overwatch_user:password@localhost:5432/overwatch" npx prisma migrate deploy
DATABASE_URL="postgresql://overwatch_user:password@localhost:5432/overwatch" npx prisma db seed
```

---

## 🔴 Redis Setup

### 1. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
```

### 2. Configure Redis

Edit `/etc/redis/redis.conf`:
```ini
bind 127.0.0.1
port 6379
requirepass your-redis-password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

### 3. Test Redis

```bash
redis-cli -a your-redis-password ping
# Should return: PONG
```

---

## 🔐 Environment Configuration

Create `/opt/overwatch/backend/.env` for production:

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://overwatch_user:strong-password@localhost:5432/overwatch"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-64-character-random-secret-key-here"

# CORS Origins (comma-separated)
CORS_ORIGIN="https://overwatch.yourdomain.com"
SOCKET_CORS_ORIGIN="https://overwatch.yourdomain.com"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="your-redis-password"

# Encryption Key (32 bytes, base64 encoded)
ENCRYPTION_KEY="your-32-byte-base64-encoded-key"

# Logging
LOG_LEVEL="warn"

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_HOURS=24

# Pi Engine (optional)
OVERWATCH_AI_ENGINE="native"

# File Uploads
MAX_FILE_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Secure the `.env` File

```bash
sudo chown root:overwatch /opt/overwatch/backend/.env
sudo chmod 640 /opt/overwatch/backend/.env
```

---

## 🚀 Systemd Service Configuration

### Backend Service

Create `/etc/systemd/system/overwatch-backend.service`:

```ini
[Unit]
Description=Overwatch Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=overwatch
Group=overwatch
WorkingDirectory=/opt/overwatch/backend
Environment=NODE_ENV=production
EnvironmentFile=/opt/overwatch/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=overwatch-backend

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/overwatch/backend/prisma

[Install]
WantedBy=multi-user.target
```

### Frontend Service (if serving static files)

Create `/etc/systemd/system/overwatch-frontend.service`:

```ini
[Unit]
Description=Overwatch Frontend Static Server
After=network.target overwatch-backend.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/overwatch/frontend
ExecStart=/usr/bin/npx serve -s dist -l 5173
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable overwatch-backend
sudo systemctl start overwatch-backend

# Check status
sudo systemctl status overwatch-backend
```

---

## 🌐 Nginx Reverse Proxy Setup

### 1. Install Nginx

```bash
sudo apt install nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/overwatch`:

```nginx
server {
    listen 80;
    server_name overwatch.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name overwatch.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/overwatch.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/overwatch.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss: https:; frame-ancestors 'none';" always;

    # Frontend static files
    location / {
        root /opt/overwatch/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Logs
    access_log /var/log/nginx/overwatch.access.log;
    error_log /var/log/nginx/overwatch.error.log;
}
```

### 3. Enable Site and Obtain SSL Certificate

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/overwatch /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d overwatch.yourdomain.com

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📦 Application Deployment

### 1. Clone Repository

```bash
sudo mkdir -p /opt/overwatch
sudo chown overwatch:overwatch /opt/overwatch
cd /opt/overwatch

git clone <repository-url> .
```

### 2. Install Dependencies

```bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..
```

### 3. Build Applications

```bash
# Build backend
cd backend
pnpm build

# Build frontend
cd ../frontend
pnpm build
```

### 4. Set Permissions

```bash
sudo chown -R overwatch:overwatch /opt/overwatch
sudo chmod -R 755 /opt/overwatch
```

---

## 🔒 Security Considerations

### Firewall Configuration

**UFW (Ubuntu):**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow from 127.0.0.1 to any port 3000  # Backend (localhost only)
sudo ufw allow from 127.0.0.1 to any port 5432  # PostgreSQL
sudo ufw allow from 127.0.0.1 to any port 6379  # Redis
sudo ufw enable
```

### Database Security

1. **Never expose PostgreSQL to the internet**
2. Use strong passwords (minimum 32 characters)
3. Enable SSL for database connections in production
4. Regular backups with encryption

### Application Security

1. **Keep dependencies updated:**
   ```bash
   pnpm audit
   pnpm update
   ```

2. **Enable Helmet.js headers** (already configured in Express)

3. **Rate limiting** is enabled by default

4. **CORS** should be restricted to your domain only

5. **Regular security audits:**
   ```bash
   npm audit --audit-level=high
   ```

---

## 💾 Backup Strategy

### PostgreSQL Backups

Create `/opt/overwatch/scripts/backup-db.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/overwatch"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -U overwatch_user -h localhost overwatch | gzip > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make executable and schedule with cron:
```bash
chmod +x /opt/overwatch/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/overwatch/scripts/backup-db.sh >> /var/log/overwatch-backup.log 2>&1" | sudo crontab -
```

### SQLite Backups (Development)

```bash
# Manual backup
cp backend/prisma/dev.db backend/prisma/dev.db.backup.$(date +%Y%m%d)
```

### Backup Verification

Test restore process monthly:
```bash
gunzip -c postgres_20260607_020000.sql.gz | psql -U overwatch_user -h localhost overwatch
```

---

## 📊 Monitoring and Logging

### Application Logs

Logs are written to:
- `/var/log/journal/overwatch-backend.journal` (systemd journal)
- `backend/error.log` and `backend/combined.log` (Winston logs)

View logs:
```bash
sudo journalctl -u overwatch-backend -f
```

### Health Check Endpoint

Implement a health check route at `/api/health`:

```typescript
router.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`;
  const redisOk = await redis.ping();
  
  res.json({
    status: dbOk && redisOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  });
});
```

Monitor with uptime monitoring service (UptimeRobot, Pingdom, etc.)

### Resource Monitoring

```bash
# CPU and memory
htop

# Disk usage
df -h

# Process status
systemctl status overwatch-backend

# Network connections
netstat -tulpn | grep :3000
```

---

## 🔄 Deployment Updates

### Zero-Downtime Deployment Script

Create `/opt/overwatch/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "Starting deployment..."

# Pull latest changes
cd /opt/overwatch
git pull origin main

# Install dependencies
pnpm install
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# Build
cd backend && pnpm build && cd ..
cd frontend && pnpm build && cd ..

# Run migrations
cd backend
npx prisma migrate deploy

# Restart services
sudo systemctl restart overwatch-backend

echo "Deployment complete!"
```

Usage:
```bash
chmod +x /opt/overwatch/scripts/deploy.sh
/opt/overwatch/scripts/deploy.sh
```

### Rollback Procedure

If deployment fails:

```bash
# Rollback code
cd /opt/overwatch
git reset --hard HEAD~1

# Restore database backup (if needed)
gunzip -c /var/backups/overwatch/postgres_YYYYMMDD_HHMMSS.sql.gz | psql -U overwatch_user -h localhost overwatch

# Restart services
sudo systemctl restart overwatch-backend
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u overwatch-backend --no-pager -n 50

# Check environment file
cat /opt/overwatch/backend/.env

# Test database connection
psql -U overwatch_user -h localhost overwatch -c "SELECT 1"
```

### High Memory Usage

1. Check for memory leaks in logs
2. Reduce Prisma connection pool size
3. Implement pagination for large queries
4. Consider horizontal scaling

### WebSocket Connection Issues

1. Verify Nginx WebSocket configuration
2. Check firewall rules
3. Verify CORS settings match frontend domain
4. Test direct connection: `ws://localhost:3000`

### Database Connection Errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection limit
psql -U overwatch_user -h localhost overwatch -c "SHOW max_connections"

# Check active connections
psql -U overwatch_user -h localhost overwatch -c "SELECT count(*) FROM pg_stat_activity"
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer:** Add HAProxy or AWS ALB in front of multiple backend instances
2. **Session Stickiness:** Required for WebSocket connections
3. **Database Connection Pooling:** Use PgBouncer for PostgreSQL
4. **Redis Cluster:** For distributed caching

### Vertical Scaling

- Increase server RAM for larger model inference
- Use SSD storage for database
- Consider GPU instances for local model hosting

---

*For ongoing maintenance, refer to the main [README.md](./README.md)*
