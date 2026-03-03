# 🎮 Mission Control - Setup Complete

## ✅ Installation Status

**Mission Control** is now running at: **http://localhost:4000**

---

## 📊 What It Does

**Mission Control** is a **web dashboard** for orchestrating AI agents:

- 🎯 **Task Management** — Kanban board with drag-and-drop across 7 status columns
- 🧠 **AI Planning** — Interactive Q&A flow where AI asks clarifying questions
- 🤖 **Agent System** — Auto-creates specialized agents, assigns tasks, tracks progress
- 🔗 **Gateway Integration** — Directly connects to your OpenClaw Gateway
- 📡 **Live Feed** — Real-time event stream showing agent activity

---

## 🚀 Quick Access

**Open in browser:**
```
http://localhost:4000
```

**Gateway connection:**
- URL: `ws://127.0.0.1:18789`
- Token: `9d801f111a4eaf2921e815803c4d9b98452c25354d2153b3` (configured in `.env.local`)

---

## 🎯 How to Use

### 1. Create a Task
- Click "New Task"
- Give it a title and description
- Example: "Optimize OpenClaw compaction settings"

### 2. AI Planning
- The AI will ask clarifying questions
- Answer them to refine the task
- AI creates a plan based on your answers

### 3. Assign to Agent
- AI auto-creates a specialized agent
- Task is assigned and starts executing
- Watch progress in real-time

### 4. Monitor
- Kanban board shows task status
- Live feed displays agent activity
- Completed work appears as deliverables

---

## 📋 Task Flow

```
CREATE → PLAN → ASSIGN → EXECUTE → DELIVER

PLANNING → INBOX → ASSIGNED → IN PROGRESS → TESTING → REVIEW → DONE
```

---

## 🛠 Configuration

### Environment Variables (`.env.local`)

```env
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=9d801f111a4eaf2921e815803c4d9b98452c25354d2153b3
DATABASE_PATH=./mission-control.db
WORKSPACE_BASE_PATH=/home/localadmin/.openclaw/workspace
PROJECTS_PATH=/home/localadmin/.openclaw/workspace/projects
```

### Security (Optional)

Generate tokens for production:
```bash
openssl rand -hex 32  # MC_API_TOKEN
openssl rand -hex 32  # WEBHOOK_SECRET
```

---

## 🔄 Process Management

### Start Mission Control
```bash
cd ~/.openclaw/workspace/mission-control
npm run dev
```

### Stop Mission Control
```bash
# Find and kill the process
lsof -i :4000
kill -9 <PID>
```

### Production Build
```bash
npm run build
npx next start -p 4000
```

---

## 🎨 Features

- **Kanban Board** — Drag-and-drop tasks across 7 columns
- **AI Planning** — Interactive Q&A for task clarification
- **Agent Discovery** — Import existing agents from OpenClaw
- **Live Events** — Real-time agent activity feed
- **Multi-Machine** — Run on different machines (supports Tailscale)
- **Docker Ready** — Production-optimized container support

---

## 📝 Project Structure

```
mission-control/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/
│   │   │   ├── tasks/          # Task CRUD + planning + dispatch
│   │   │   ├── agents/         # Agent management
│   │   │   ├── openclaw/       # Gateway proxy endpoints
│   │   │   └── webhooks/       # Agent completion webhooks
│   │   ├── settings/           # Settings page
│   │   └── workspace/[slug]/   # Workspace dashboard
│   ├── components/             # React components
│   │   ├── MissionQueue.tsx    # Kanban board
│   │   ├── PlanningTab.tsx     # AI planning interface
│   │   ├── AgentsSidebar.tsx   # Agent panel
│   │   ├── LiveFeed.tsx        # Real-time events
│   │   └── TaskModal.tsx       # Task create/edit
│   └── lib/
│       ├── db/                 # SQLite + migrations
│       ├── openclaw/           # Gateway client + device identity
│       └── validation.ts       # Zod schemas
└── .env.local                  # Configuration (git-ignored)
```

---

## 🔧 Troubleshooting

### Can't connect to OpenClaw Gateway?
```bash
# Check OpenClaw is running
openclaw gateway status

# Verify URL and token in .env.local
cat .env.local

# Check firewall
sudo ufw status
```

### Port 4000 already in use?
```bash
lsof -i :4000
kill -9 <PID>
```

### Reset database?
```bash
rm mission-control.db
```

---

## 📚 Documentation

- **Official Docs:** https://missioncontrol.ghray.com
- **GitHub:** https://github.com/crshdn/mission-control
- **Live Demo:** https://missioncontrol.ghray.com

---

## 🎉 Next Steps

1. **Open the dashboard:** http://localhost:4000
2. **Create your first task** — Try "Review SIP security improvements"
3. **Watch AI plan** — Answer clarifying questions
4. **Monitor progress** — See the Kanban board update in real-time

---

**Status:** ✅ Running on http://localhost:4000
**Gateway:** ✅ Connected to ws://127.0.0.1:18789
**Database:** SQLite (auto-created at `./mission-control.db`)

---

*Built with Next.js, TypeScript, SQLite, and OpenClaw* 🚀