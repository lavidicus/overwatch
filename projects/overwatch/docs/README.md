# Overwatch Platform Documentation

**Overwatch** is a multi-agent AI consensus platform that enables teams of AI advisors to collaborate on complex problems, debate solutions, and reach consensus through structured discussion rounds.

## 📋 Table of Contents

- [Getting Started](./GETTING-STARTED.md) - Developer setup and quickstart
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [API Reference](./API.md) - Complete API endpoint documentation
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions

## 🚀 Project Overview

Overwatch orchestrates multi-agent AI discussions where:
- Multiple AI agents (with different roles) discuss a topic
- A judge agent evaluates whether consensus has been reached
- Discussion continues for multiple rounds until consensus or max rounds
- Tool calling allows agents to interact with external systems
- Human approval workflows for sensitive operations

### Key Features

✅ **Multi-Agent Consensus Panels** - Configure teams of 2-8 AI advisors with distinct roles (Facilitator, Analyst, Critic, Advisor)

✅ **Judge System** - Dedicated judge provider evaluates consensus after each round

✅ **Tool Calling** - Agents can call external tools with optional human approval gates

✅ **Live Streaming** - Real-time WebSocket updates during consensus rounds

✅ **RAG Memory** - Persistent memory system for context retention across sessions

✅ **Provider Abstraction** - Support for vLLM, Ollama, llama.cpp, OpenAI, Anthropic, and custom providers

✅ **Benchmarking** - Built-in speed and quality benchmarking via BenchLoop

✅ **Pi Engine Integration** - Optional Pi execution engine for advanced tool orchestration

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Real-time:** Socket.io for live consensus updates
- **Auth:** JWT-based authentication with MFA support
- **Encryption:** AES-256 encryption for sensitive credentials

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** Material-UI (MUI) v5
- **State Management:** Zustand + React Query
- **Build Tool:** Vite

### Infrastructure
- **AI Providers:** vLLM, Ollama, llama.cpp, OpenAI, Anthropic
- **Queue System:** Redis-backed task queues
- **Monitoring:** Winston logging, audit trails

## 📊 Current Build Status

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Core chat infrastructure | ✅ Complete |
| Phase 2 | Provider system & model management | ✅ Complete |
| Phase 3 | AI proxy & benchmarking | ✅ Complete |
| Phase 4 | Consensus panels (group chat) | ✅ Complete |
| Phase 5 | Pi AI integration | ✅ Complete |
| Phase 6 | Tool calling with approvals | ✅ Complete |
| Phase 7 | RAG memory system | ✅ Complete |

## 🏗️ Project Structure

```
overwatch/
├── backend/
│   ├── prisma/              # Database schema & migrations
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic & orchestration
│   │   ├── middleware/      # Auth, rate limiting, audit
│   │   ├── utils/           # Shared utilities
│   │   └── config/          # Environment & configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   ├── components/      # Reusable UI components
│   │   ├── api/             # API client functions
│   │   ├── hooks/           # React hooks
│   │   └── utils/           # Frontend utilities
│   └── package.json
├── docs/                    # This documentation
└── package.json             # Root workspace config
```

## 📝 Quick Links

- **GitHub Repo:** https://github.com/lavidicus/sam
- **Main Session Model:** ollama/qwen3.5:cloud
- **Sub-Agent Model:** vllm/llamacpp (vLLM container on gateway)
- **Documentation:** `/docs` directory

---

*Last updated: June 2026*
