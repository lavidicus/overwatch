# Overwatch

AI Inference Harness Management and Agent Orchestration Platform

## Overview

Overwatch provides a single-pane-of-glass for:

- Connecting to LLM providers (vLLM, Ollama, llama.cpp, OpenAI, Anthropic, OpenClaw, Hermes)
- Managing AI agents with tool calling via MCP protocol
- Benchmarking model speed/quality
- Queueing and routing tasks across multiple models
- Multi-user chat with per-user isolation and group collaboration
- RBAC with privilege elevation for system administration
- Long-term AI memory via RAG/vector database
- Configuration/change management with human-in-the-loop approval

## Tech Stack

**Backend:**
- Express.js + TypeScript
- Prisma ORM (PostgreSQL primary, SQLite for dev)
- BullMQ + Redis (task queue)
- Socket.io (real-time)
- JWT auth + bcrypt + TOTP MFA
- AES-256-GCM envelope encryption

**Frontend:**
- React 19 + Vite 6
- Material-UI 6
- Zustand (state)
- TanStack Query (API layer)
- Socket.io-client

## Quick Start

### Prerequisites

- Node.js ≥ 20.0.0
- pnpm ≥ 9.0.0
- PostgreSQL 14+ (or SQLite for pilot)
- Redis 6.2+

### Installation

```bash
cd overwatch

# Install dependencies
pnpm install

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Generate Prisma client
cd backend && pnpm db:generate

# Run migrations (creates database schema)
pnpm db:migrate

# Seed initial admin user (optional)
pnpm db:seed

# Start development servers
cd ..
pnpm dev
```

### Default Credentials (after seed)

- Email: `admin@overwatch.local`
- Password: `Admin123!Secure`
- **Change immediately after first login!**

## Project Structure

```
overwatch/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database models
│   ├── src/
│   │   ├── index.ts           # Express app entry
│   │   ├── middleware/        # Auth, rate limiting, audit
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic (encryption, etc.)
│   │   └── utils/             # Helpers
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app + routing
│   │   ├── layouts/           # MainLayout with sidebar
│   │   ├── pages/             # Route pages
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API clients
│   │   └── stores/            # Zustand state
│   └── vite.config.ts
└── package.json               # Workspace root
```

## Phase 1 Status (Weeks 1-2)

### ✅ Completed

- [x] Monorepo structure with pnpm workspaces
- [x] Backend: Express + TypeScript + ESLint + Prettier
- [x] Frontend: React 19 + MUI 6 + Vite 6
- [x] Prisma schema (30 models, all bidirectional relations)
- [x] Environment configuration (.env.example)
- [x] Authentication system:
  - User registration (admin creates first user)
  - JWT login/logout
  - MFA (TOTP) support
  - CSRF token generation
  - Password hashing (bcrypt)
  - Rate limiting (per-user, per-IP)
  - 4-tier RBAC (ADMIN/OPERATOR/USER/VIEWER)
- [x] Settings module (key-value CRUD with categories)
- [x] Encryption service (AES-256-GCM envelope encryption, key versioning)
- [x] Audit logging middleware and API
- [x] Basic UI shell:
  - MUI dark theme
  - MainLayout with sidebar navigation
  - LoginPage with MFA support
  - Protected route wrapper
  - Zustand auth store
  - React-query API layer

### 🚧 Next Phases

**Phase 2 (Weeks 3-4): Provider & Model Management**
- Provider connection/disconnection
- Model registry and configuration
- Hugging Face integration
- WhichLLM hardware analysis

**Phase 3 (Weeks 5-6): Chat & Agent Integration**
- Raw LLM chat sessions
- Agent chat with MCP tool calling
- Universal tool catalog
- Command execution queue

**Phase 4 (Weeks 7-8): Benchmarking & Routing**
- Speed/quality benchmark runner
- Multi-model traffic routing
- Task queue with BullMQ

**Phase 5 (Weeks 9-10): Memory & Self-Improvement**
- RAG memory system
- Vector store integration
- Self-improvement engine (config scope)
- Change management workflow

## Security Notes

- All sensitive fields encrypted with AES-256-GCM
- Envelope encryption with per-record DEKs
- Key versioning for progressive rotation
- Rate limiting on all endpoints
- CSRF protection on state-changing requests
- Audit logging for all significant actions
- RBAC enforced at middleware level

## License

Internal use only. All rights reserved.
