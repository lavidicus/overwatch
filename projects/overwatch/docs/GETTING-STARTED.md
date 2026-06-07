# Getting Started with Overwatch

This guide will help you set up and run the Overwatch platform for development.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| pnpm | 9+ | Package manager |
| PostgreSQL | 14+ | Production database (SQLite for dev) |
| Redis | 6.2+ | Task queue backend |
| Git | Latest | Version control |

### Install Prerequisites

**Ubuntu/Debian:**
```bash
# Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Redis
sudo apt install redis-server
```

**macOS:**
```bash
# Homebrew
brew install node@20 pnpm postgresql redis
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
cd ~/.openclaw/workspace/projects
git clone <repository-url> overwatch
cd overwatch
```

### 2. Install Dependencies

```bash
# Install root workspace dependencies
pnpm install

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### 3. Database Setup

#### Development (SQLite)

SQLite is used by default for development. No additional setup required.

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

#### Production (PostgreSQL)

1. Create PostgreSQL database:
```bash
sudo -u postgres psql
CREATE DATABASE overwatch;
CREATE USER overwatch_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE overwatch TO overwatch_user;
\q
```

2. Update `.env` file:
```env
DATABASE_URL="postgresql://overwatch_user:your_secure_password@localhost:5432/overwatch"
```

3. Run migrations:
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (SQLite for dev)
DATABASE_URL="file:./dev.db"

# For PostgreSQL:
# DATABASE_URL="postgresql://user:pass@localhost:5432/overwatch"

# JWT Secret (generate a strong random string)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Socket.io CORS
SOCKET_CORS_ORIGIN="http://localhost:5173"

# Redis (for queues)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Encryption
ENCRYPTION_KEY="your-32-byte-encryption-key-here"

# Logging
LOG_LEVEL="info"

# Pi Engine (optional)
OVERWATCH_AI_ENGINE="native"  # or "pi" or "auto"
```

### 5. Running Development Servers

#### Terminal 1: Backend
```bash
cd backend
pnpm dev
```

Backend will start on `http://localhost:3000`

#### Terminal 2: Frontend
```bash
cd frontend
pnpm dev
```

Frontend will start on `http://localhost:5173`

### 6. Default Credentials

After seeding the database, use these default credentials:

- **Email:** `admin@overwatch.local`
- **Password:** Check `backend/prisma/seed.ts` for the seeded password

⚠️ **Change these credentials immediately in production!**

## 📁 Project Structure

```
overwatch/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.ts          # Database seeding
│   │   └── dev.db           # SQLite database (dev only)
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, rate limiting, audit
│   │   ├── utils/           # Helpers
│   │   └── config/          # Environment config
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   ├── components/      # UI components
│   │   ├── api/             # API clients
│   │   └── hooks/           # React hooks
│   └── package.json
└── docs/                    # Documentation
```

## 🔧 Common Development Tasks

### Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name description_of_change
```

### Reset Database (Dev Only)

```bash
cd backend
npx prisma migrate reset
npx prisma db seed
```

### View Database (Prisma Studio)

```bash
cd backend
npx prisma studio
```

Opens database browser at `http://localhost:5555`

### Run Tests

```bash
cd backend
pnpm test

cd frontend
pnpm test
```

### Build for Production

```bash
# Build backend
cd backend
pnpm build

# Build frontend
cd frontend
pnpm build
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Migration Errors

```bash
# Reset and re-migrate
cd backend
rm dev.db
npx prisma migrate dev
npx prisma db seed
```

### Frontend Build Issues

```bash
cd frontend
rm -rf node_modules
pnpm install
pnpm dev
```

### WebSocket Connection Failed

Ensure backend and frontend CORS settings match:
- Backend: `SOCKET_CORS_ORIGIN` in `.env`
- Frontend: Check Vite proxy configuration

## 📚 Next Steps

- Read [Architecture.md](./ARCHITECTURE.md) to understand the system design
- Explore the [API Reference](./API.md) for endpoint documentation
- Review [Deployment.md](./DEPLOYMENT.md) when ready for production

---

*For additional help, check the main [README.md](./README.md)*
