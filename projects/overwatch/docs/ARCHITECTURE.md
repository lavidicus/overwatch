# Overwatch System Architecture

This document provides a comprehensive overview of the Overwatch platform architecture.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React UI   │  │  WebSocket   │  │   REST API Client    │  │
│  │   (MUI v5)   │◄─┤   Client     │◄─┤   (React Query)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Express.js + Middleware Stack               │   │
│  │  • Authentication (JWT)  • Rate Limiting                 │   │
│  │  • CORS                  • Request Validation (Zod)      │   │
│  │  • Audit Logging         • Error Handling                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Services                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Consensus  │ │  Provider  │ │    Tool    │ │   Memory   │   │
│  │ Orchestr.  │ │  Manager   │ │  Executor  │ │   (RAG)    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Queue    │ │ Benchmark  │ │  Routing   │ │   Auth     │   │
│  │  Manager   │ │   Runner   │ │   Engine   │ │  Service   │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Access Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Prisma ORM                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ PostgreSQL │ │   SQLite   │ │   Redis    │ │ Vector DB  │   │
│  │  (prod)    │ │   (dev)    │ │  (queues)  │ │  (memory)  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External AI Providers                        │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐   │
│  │  vLLM  │ │ Ollama │ │llama.cpp │ │ OpenAI │ │Anthropic │   │
│  └────────┘ └────────┘ └──────────┘ └────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Backend Architecture

### Express.js Application Structure

```
backend/src/
├── index.ts           # App initialization, middleware, route mounting
├── config/
│   └── env.ts         # Environment variable validation
├── routes/            # API route handlers (organized by domain)
│   ├── auth.ts        # Authentication endpoints
│   ├── chat.ts        # Individual chat sessions
│   ├── group-chat.ts  # Multi-agent consensus panels
│   ├── providers.ts   # AI provider management
│   ├── models.ts      # Model management
│   ├── tools.ts       # Tool registry & execution
│   ├── memory.ts      # RAG memory operations
│   └── ...
├── services/          # Business logic layer
│   ├── consensus/
│   │   └── orchestrator.ts  # Multi-agent discussion orchestration
│   ├── providers/
│   │   ├── index.ts         # Provider client factory
│   │   ├── base.ts          # Base provider client
│   │   ├── openai.ts        # OpenAI-compatible providers
│   │   ├── anthropic.ts     # Anthropic Claude
│   │   ├── ollama.ts        # Ollama local inference
│   │   └── pi.ts            # Pi execution engine
│   ├── tools/
│   │   ├── index.ts         # Tool registry
│   │   ├── builtin.ts       # Built-in tools
│   │   └── agent-loop.ts    # Agent tool-calling loop
│   ├── memory/
│   │   ├── service.ts       # Memory CRUD operations
│   │   ├── embedder.ts      # Vector embeddings
│   │   └── templates.ts     # Memory templates
│   ├── queue/               # Redis-backed job queues
│   ├── benchmark/           # Performance benchmarking
│   └── routing/             # Model routing engine
├── middleware/        # Express middleware
│   ├── auth.ts        # JWT authentication
│   ├── rateLimiter.ts # Rate limiting
│   ├── audit.ts       # Audit logging
│   └── socketAuth.ts  # WebSocket authentication
└── utils/             # Shared utilities
```

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   ↓
2. Validate credentials, generate JWT
   ↓
3. Return JWT in response
   ↓
4. Client stores JWT (localStorage/cookie)
   ↓
5. Subsequent requests include JWT in Authorization header
   ↓
6. authenticate middleware validates JWT
   ↓
7. req.user populated with user context
```

### Consensus Orchestration Flow

```
User submits topic
       ↓
Create ConsensusRound (status: IN_PROGRESS)
       ↓
For each round (1 to maxRounds):
   ├─ Emit 'group:round:start' via Socket.io
   ├─ For each agent (parallel):
   │   ├─ Emit 'group:round:agent:start'
   │   ├─ Call provider API with prompt + context
   │   ├─ Handle tool calls (if enabled):
   │   │   ├─ Emit 'group:round:agent:tool_call'
   │   │   ├─ Wait for approval (if required)
   │   │   └─ Execute tool, emit 'group:round:agent:tool_result'
   │   ├─ Store agent response
   │   └─ Emit 'group:round:agent:complete'
   ├─ Judge evaluates consensus
   ├─ If consensus reached:
   │   ├─ Set round status: REACHED_CONSENSUS
   │   ├─ Emit 'group:round:complete'
   │   └─ Break loop
   └─ If no consensus and rounds remaining:
       └─ Continue to next round
       ↓
Emit 'group:consensus:complete'
Return full transcript
```

## 🎨 Frontend Architecture

### React Application Structure

```
frontend/src/
├── App.tsx                  # Root component, routing
├── main.tsx                 # Entry point
├── pages/                   # Route-level components
│   ├── GroupChatPage.tsx    # AI Panel consensus UI
│   ├── ChatPage.tsx         # Individual chat UI
│   ├── ProvidersPage.tsx    # Provider management
│   └── ...
├── components/              # Reusable UI components
│   ├── CreateGroupDialog.tsx # Panel creation/edit dialog
│   ├── RoundCard.tsx        # Consensus round display
│   ├── ToolEventCard.tsx    # Tool call visualization
│   └── ...
├── api/                     # API client functions
│   ├── group-chat.ts        # Group chat API calls
│   ├── chat.ts              # Chat API calls
│   ├── tools.ts             # Tool API calls
│   └── ...
├── hooks/                   # Custom React hooks
│   ├── useSocket.ts         # WebSocket connection
│   └── ...
└── utils/                   # Frontend utilities
```

### State Management

**Zustand** - Global application state
- User authentication state
- UI preferences
- Active session context

**React Query** - Server state management
- API data caching
- Background refetching
- Optimistic updates

### WebSocket Event Handling

```typescript
// Client subscribes to group room
socket.emit('group:join', groupId)

// Server emits events during consensus:
socket.on('group:round:start', payload => { ... })
socket.on('group:round:agent:start', payload => { ... })
socket.on('group:round:agent:tool_call', payload => { ... })
socket.on('group:round:agent:tool_result', payload => { ... })
socket.on('group:round:agent:complete', payload => { ... })
socket.on('group:round:complete', payload => { ... })
socket.on('group:consensus:complete', payload => { ... })
```

## 🗄️ Database Schema Overview

### Core Tables

**Users** - User accounts with roles and MFA
```prisma
User {
  id, email, displayName, passwordHash, role
  mfaEnabled, mfaSecret, lastLogin
}
```

**Providers** - AI provider configurations
```prisma
Provider {
  id, name, type, baseUrl, port, apiKey (encrypted)
  model, status, latencyMs, config (JSON)
}
```

**ProviderModels** - Available models per provider
```prisma
ProviderModel {
  id, providerId, name, displayName, quantization
  sizeGB, parameters, status, downloadProgress
}
```

**ChatGroups** - Multi-agent panel definitions
```prisma
ChatGroup {
  id, name, description, ownerId, maxRounds
  judgeProviderId, judgeModelId
  allowToolCalls, requireToolApproval, allowedToolIds (JSON)
}
```

**AgentParticipants** - Agents within a panel
```prisma
AgentParticipant {
  id, groupId, agentName, providerId, modelId
  role (facilitator|analyst|critic|advisor), systemPrompt, position
}
```

**ConsensusRounds** - Discussion round records
```prisma
ConsensusRound {
  id, groupId, sessionId, roundNumber, topic
  status, finalConsensus, judgeAnalysis
}
```

**ConsensusMessages** - Individual agent responses
```prisma
ConsensusMessage {
  id, roundId, agentName, message, role, position
}
```

**Tools** - Available tool definitions
```prisma
Tool {
  id, name, description, category, schema (JSON)
  enabled, requiresApproval
}
```

**ToolInvocations** - Tool execution records
```prisma
ToolInvocation {
  id, sessionId, toolId, userId, args (JSON)
  status, result (JSON), error, durationMs
}
```

**Memories** - RAG memory entries
```prisma
Memory {
  id, userId, category, content, metadata (JSON)
  relevanceScore, isPromoted, accessCount, ttlDays
}
```

## 🔌 Provider System Architecture

### Provider Abstraction Layer

All AI providers implement a common interface:

```typescript
interface ProviderClient {
  chatCompletion(request: ChatRequest): Promise<ChatResponse>;
  listModels(): Promise<ModelInfo[]>;
  healthCheck(): Promise<HealthStatus>;
}
```

### Supported Provider Types

| Type | Implementation | Protocol |
|------|---------------|----------|
| VLLM | OpenAICompatibleProvider | OpenAI API |
| LLAMACPP | OpenAICompatibleProvider | OpenAI API |
| OPENAI | OpenAICompatibleProvider | OpenAI API |
| CUSTOM | OpenAICompatibleProvider | OpenAI API |
| OLLAMA | OllamaProvider | Ollama API |
| ANTHROPIC | AnthropicProvider | Anthropic API |

### Pi Engine Integration

When `OVERWATCH_AI_ENGINE="pi"` or `"auto"`:
- Tool calls are routed through Pi execution engine
- Pi handles complex orchestration and state management
- Falls back to native provider on failure

## 🛠️ Tool Calling System

### Tool Execution Flow

```
Agent requests tool call
       ↓
Orchestrator validates tool availability
       ↓
If requiresApproval:
   ├─ Emit tool_call event (status: pending-approval)
   ├─ Wait for user approval/rejection
   └─ If rejected: return error to agent
       ↓
Execute tool via appropriate handler
       ↓
Store result in ToolInvocation
       ↓
Emit tool_result event
       ↓
Return result to agent
```

### Built-in Tool Categories

- **System Tools:** SSH execution, file operations
- **Communication Tools:** Email, messaging
- **Data Tools:** Database queries, API calls
- **Analysis Tools:** Code review, log analysis

## 🧠 RAG Memory System

### Memory Lifecycle

1. **Capture:** Extract relevant information from conversations
2. **Embed:** Generate vector embeddings using configured model
3. **Store:** Save to vector database with metadata
4. **Retrieve:** Semantic search based on query context
5. **Decay:** Reduce relevance score over time
6. **Prune:** Remove low-relevance memories after TTL

### Memory Categories

- `USER_PROFILE` - User preferences and context
- `CONVERSATION_HIGHLIGHTS` - Key conversation points
- `LONG_TERM` - Persistent knowledge
- `SESSION_CONTEXT` - Current session state
- `TASK_STATE` - In-progress task information
- `AGENT_BEHAVIOR` - Agent tuning parameters
- `SYSTEM_CONFIG` - System configuration snapshots

## 📊 Queue System

### Redis-Backed Task Queues

```
Task Submission
       ↓
QueueTask created (status: WAITING)
       ↓
Worker polls for tasks by priority
       ↓
Task status → PROCESSING
       ↓
Execute inference via provider
       ↓
Task status → COMPLETED or FAILED
       ↓
Result stored, callbacks triggered
```

### Priority Levels

Tasks are processed by priority (higher first), then by creation time.

---

*This architecture document provides a high-level overview. Refer to individual source files for implementation details.*
