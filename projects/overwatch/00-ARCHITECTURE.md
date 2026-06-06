# Overwatch — Architecture & Build Plan

## 1. Overview

**Overwatch** is a web application for managing, benchmarking, and orchestrating AI inference harnesses (vLLM, Ollama, llama.cpp) and agent platforms (OpenClaw, Hermes) across local and remote systems. It provides a single-pane-of-glass for:

- Connecting to LLM providers (vLLM, Ollama, llama.cpp, OpenAI, Anthropic, OpenClaw, Hermes)
- Connecting to agent platforms (OpenClaw Pi architecture, Hermes Agent) for tool calling and command execution
- Using agent tools that Overwatch does not have natively (SSH, git, web browse, email, calendar, matrix, filesystem)
- Executing Pi tool calls from any provider — model produces tool intent, Pi engine executes it
- Sending natural language commands to agents for task execution
- Configuring models with full vLLM/Ollama parameter syntax
- Benchmarking model speed/quality
- Queueing and routing tasks across multiple models
- Compiling, installing, and managing LLM software on remote systems via SSH
- Searching/downloading models from Hugging Face with WhichLLM hardware-aware recommendations
- Multi-user chat with per-user chat isolation, group collaboration, and agent tool integration
- RBAC with privilege elevation for system administration
- Long-term AI memory via RAG/vector database with controlled LLM context windows
- Self-improvement engine (v1: configuration/preference tweaks only) that continuously updates the website and its components
- Configuration/change management system for tracking and reviewing all changes
- Real-time streaming via Socket.io (chat responses, install logs, tool calls, Bull job progress)

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js + TypeScript |
| Frontend | React 19 + Material-UI 6 + Vite 6 |
| Database | PostgreSQL (primary) / SQLite with WAL mode (v1 pilot only) via Prisma ORM |
| Vector DB | `sqlite-vec` (local) or Pinecone/Weaviate/Chroma/Qdrant (cloud) |
| Embeddings | OpenAI text-embedding-3-small, or local: sentence-transformers (all-MiniLM-L6-v2) |
| Task Queue | BullMQ (Redis ≥ 6.2) |
| Real-Time Transport | Socket.io with JWT handshake auth (rooms: `chat:{sessionId}`, `install:{systemId}`, `user:{userId}`) |
| Auth | JWT (bcrypt password hashing) + per-user/per-IP rate limiting |
| State | Zustand (frontend) + React Query |
| Routing | react-router-dom v7 |
| Charts | Recharts |
| Graphs | react-force-graph-2d, @xyflow/react |
| Maps | Leaflet |
| Markdown | react-quill (chat input), marked (output) |
| File I/O | multer (uploads), pdf-parse, mammoth |
| Self-Improvement | Cron-based review engine + human-in-the-loop approval UI (config/preference scope only) |
| Change Management | Git-style change log + PR-like approval workflow |
| Security | AES-256-GCM envelope encryption with key versioning, AWS KMS / GCP KMS / Vault support |
| Container | Multi-stage Dockerfile (build → slim runtime), docker-compose for dev |
| MCP | `services/mcp-client.ts` for OpenClaw tool connections (stdio/SSE) |

## 3. Project Structure

```
overwatch/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Data models
│   ├── src/
│   │   ├── index.ts               # Express app bootstrap
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT auth, role checks
│   │   │   ├── rateLimiter.ts     # Per-user/per-IP rate limiting
│   │   │   ├── errorHandler.ts    # Central error handling
│   │   │   └── audit.ts           # Audit logging
│   │   ├── routes/
│   │   │   ├── auth.ts            # Login, register, logout
│   │   │   ├── csrf.ts            # CSRF token generation/validation
│   │   │   ├── users.ts           # User CRUD (admin)
│   │   │   ├── settings.ts        # App settings, provider configs, encryption key mgmt
│   │   │   ├── providers.ts       # Provider lifecycle (connect/disconnect)
│   │   │   ├── models.ts          # Model registry, config CRUD
│   │   │   ├── benchmark.ts       # Benchmark runs, results
│   │   │   ├── chat.ts            # Chat sessions, messages
│   │   │   ├── chat-group.ts      # Group chats
│   │   │   ├── queue.ts           # Task queue status, manual routing
│   │   │   ├── routing.ts         # Router LLM config, traffic rules
│   │   │   ├── systems.ts         # Remote system management
│   │   │   ├── ssh.ts             # SSH key/credential management
│   │   │   ├── install.ts         # Install/upgrade vLLM/Ollama/llama.cpp
│   │   │   ├── huggingface.ts     # Hugging Face model search/download
│   │   │   ├── whatllm.ts         # WhichLLM hardware analysis + model recommendations
│   │   │   ├── ai-proxy.ts        # Unified chat completion proxy
│   │   │   ├── agents.ts          # Agent platform connections (OpenClaw/Hermes)
│   │   │   ├── agent-tools.ts     # MCP client wrapper for tool catalog + invocation
│   │   │   ├── agent-chat.ts      # Agent chat sessions + tool call results
│   │   │   ├── agent-commands.ts  # Command execution for agents
│   │   │   ├── memory.ts          # RAG memory: index, search, manage
│   │   │   ├── memory-context.ts  # Context window management for LLM sessions
│   │   │   ├── self-improve.ts    # Self-improvement engine control + review (config scope only)
│   │   │   ├── changelog.ts       # Change management / config versioning
│   │   │   ├── health.ts          # System health, provider status
│   │   │   └── admin.ts           # Admin endpoints (audit, logs)
│   │   ├── services/
│   │   │   ├── provider.ts        # Provider client abstraction
│   │   │   │   ├── vllm.ts        # vLLM-specific implementation
│   │   │   │   ├── ollama.ts      # Ollama-specific implementation
│   │   │   │   ├── llamacpp.ts    # llama.cpp server implementation
│   │   │   │   ├── openai.ts      # OpenAI-compatible API
│   │   │   │   ├── anthropic.ts   # Anthropic API
│   │   │   │   ├── openclaw.ts    # OpenClaw agent via MCP client
│   │   │   │   └── hermes.ts      # Hermes agent + tool routing
│   │   │   ├── benchmark.ts       # Speed/quality benchmark runner
│   │   │   ├── queue-worker.ts    # BullMQ queue processor
│   │   │   ├── router.ts          # Multi-model traffic routing
│   │   │   ├── ssh-manager.ts     # SSH session management (with timeout/health check)
│   │   │   ├── installer.ts       # Remote install/upgrade via SSH
│   │   │   ├── huggingface.ts     # HF model search/download
│   │   │   ├── whatllm.ts         # WhichLLM CLI integration for hardware detection
│   │   │   ├── mcp-client.ts      # MCP protocol client (stdio/SSE) for OpenClaw tools
│   │   │   ├── encryption.ts      # AES-256-GCM envelope encryption with key versioning
│   │   │   ├── chat-orchestrator.ts # Multi-agent chat coordination + Socket.io rooms
│   │   │   ├── audit.ts           # Audit logging service
│   │   │   ├── logger.ts          # Winston logging
│   │   │   ├── vector-store.ts    # Vector store (sqlite-vec or cloud)
│   │   │   ├── memory-manager.ts  # Memory indexing, retrieval, pruning (with user-consent queue)
│   │   │   ├── self-improvement.ts # Self-improvement engine (config scope only)
│   │   │   ├── change-manager.ts  # Change management / config versioning
│   │   │   └── system-log.ts      # System log for engine debug output
│   │   ├── utils/
│   │   │   ├── crypto.ts          # AES-256-GCM envelope encryption helpers
│   │   │   ├── ssh.ts             # SSH key generation/management
│   │   │   └── validators.ts      # Zod schemas for input validation
│   │   └── types/
│   │       ├── index.ts           # Shared TypeScript interfaces
│   │       ├── memory.ts          # Memory/vector types
│   │       ├── improvement.ts     # Improvement engine types
│   │       ├── changelog.ts       # Change management types
│   │       └── socket.ts          # Socket.io room/convention types
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.tsx               # App bootstrap
│   │   ├── App.tsx                # Route definitions
│   │   ├── theme.ts               # MUI theme
│   │   ├── hooks/
│   │   │   ├── useAuth.ts         # Auth state (Zustand)
│   │   │   ├── useProviders.ts    # Provider management
│   │   │   ├── useChat.ts         # Chat hooks
│   │   │   └── useSocket.ts       # Socket.io connection/rooms
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # Sidebar nav, app shell
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx            # Authentication
│   │   │   ├── DashboardPage.tsx        # Overview + health
│   │   │   ├── ProvidersPage.tsx        # Provider connections
│   │   │   ├── AgentsPage.tsx           # Agent platform connections (OpenClaw/Hermes)
│   │   │   ├── ModelsPage.tsx           # Model registry + config
│   │   │   ├── ToolCatalogPage.tsx      # Universal tool catalog (browsable + testable)
│   │   │   ├── BenchmarkPage.tsx        # Run/view benchmarks
│   │   │   ├── ChatPage.tsx             # 1:1 chat sessions (raw LLM)
│   │   │   ├── AgentChatPage.tsx        # Agent chat (OpenClaw/Hermes with tool execution)
│   │   │   ├── ChatGroupPage.tsx        # Group chats
│   │   │   ├── RoutingPage.tsx          # Traffic routing rules
│   │   │   ├── SystemsPage.tsx          # Remote system management
│   │   │   ├── InstallPage.tsx          # Install/upgrade wizard
│   │   │   ├── ModelSearchPage.tsx      # HF search + download
│   │   │   ├── HardwarePage.tsx         # WhichLLM analysis results
│   │   │   ├── CommandsPage.tsx         # Send commands to agents
│   │   │   ├── SettingsPage.tsx         # App settings + encryption key management
│   │   │   ├── AdminPage.tsx            # User/role management
│   │   │   ├── MemoryPage.tsx           # RAG memory: view, search, curate
│   │   │   ├── MemoryContextPage.tsx    # LLM context window control
│   │   │   ├── SelfImprovementPage.tsx  # Improvement proposals + review
│   │   │   ├── ChangeManagementPage.tsx # Change log + approval workflow
│   │   │   └── AuditPage.tsx            # Audit log viewer
│   │   ├── components/
│   │   │   ├── ui/                # Shared MUI wrappers
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── CodeBlock.tsx
│   │   │   │   ├── ModelConfigForm.tsx
│   │   │   │   ├── ParameterEditor.tsx
│   │   │   │   └── SystemCard.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ModelSelector.tsx
│   │   │   ├── agents/
│   │   │   │   ├── AgentCard.tsx            # Agent platform connection card
│   │   │   │   ├── AgentChatWindow.tsx      # Chat with agent (tool results inline)
│   │   │   │   ├── ToolCallResult.tsx       # Displays tool call + result
│   │   │   │   ├── ToolCatalogGrid.tsx      # Browsable tool cards
│   │   │   │   ├── ToolTestPanel.tsx        # Run tool + see result
│   │   │   │   ├── CommandInput.tsx         # Send command to agent
│   │   │   │   ├── CommandResult.tsx        # Command execution output
│   │   │   │   ├── PiToolRunner.tsx         # Pi engine tool execution UI
│   │   │   │   └── ToolCallStream.tsx       # Live tool call stream display
│   │   │   ├── providers/
│   │   │   │   ├── ProviderCard.tsx
│   │   │   │   ├── ProviderStatus.tsx
│   │   │   │   └── ConnectionTest.tsx
│   │   │   ├── systems/
│   │   │   │   ├── SystemDetail.tsx
│   │   │   │   ├── InstallProgress.tsx
│   │   │   │   ├── ModelDownloader.tsx
│   │   │   │   └── SSHConfig.tsx
│   │   │   ├── benchmarks/
│   │   │   │   ├── BenchmarkChart.tsx
│   │   │   │   ├── BenchmarkResults.tsx
│   │   │   │   └── BenchmarkForm.tsx
│   │   │   ├── memory/
│   │   │   │   ├── MemoryTimeline.tsx     # Chronological memory view
│   │   │   │   ├── MemorySearchBar.tsx    # Semantic search UI
│   │   │   │   ├── MemoryItemCard.tsx     # Individual memory display
│   │   │   │   ├── MemoryPruner.tsx       # Pending deletions queue (24h)
│   │   │   │   └── MemoryCurator.tsx      # User memory editing/annotation
│   │   │   ├── improvement/
│   │   │   │   ├── ImprovementProposal.tsx # Improvement suggestion card
│   │   │   │   ├── ImprovementReviewPanel.tsx # Review & approve/reject
│   │   │   │   ├── ImprovementTimeline.tsx   # History of improvements
│   │   │   │   └── ImprovementPreview.tsx    # Live preview of proposed change
│   │   │   ├── changelog/
│   │   │   │   ├── ChangeCard.tsx           # Individual change entry
│   │   │   │   ├── ChangeApprovalDialog.tsx # Approve/reject change
│   │   │   │   └── ChangeHistory.tsx        # Full change history table
│   │   │   └── security/
│   │   │       ├── EncryptionKeyManager.tsx # Create/import/manage encryption keys
│   │   │       ├── CertificateUploader.tsx  # Import/manage TLS certificates
│   │   │       └── KeyVersionSelector.tsx   # Key version rotation UI
│   │   ├── services/
│   │   │   └── api.ts             # Axios instance + all API clients
│   │   └── stores/
│   │       ├── authStore.ts       # Auth state (Zustand)
│   │       ├── chatStore.ts       # Chat state (Zustand)
│   │       ├── agentStore.ts      # Agent/platform state (Zustand)
│   │       ├── memoryStore.ts     # Memory/RAG state (Zustand)
│   │       ├── improvementStore.ts # Self-improvement state (Zustand)
│   │       ├── changelogStore.ts  # Change management state (Zustand)
│   │       ├── socketStore.ts     # Socket.io connection state (Zustand)
│   │       └── uiStore.ts         # UI state (Zustand)
│   ├── vite.config.ts
│   └── package.json
├── Dockerfile                     # Multi-stage: build → slim runtime (for app + vLLM)
├── docker-compose.yml             # App + Redis (BullMQ) + PostgreSQL (or SQLite for dev)
└── README.md
```

## 4. Prisma Schema Design

### Core Models

```prisma
// ─── Users & Auth ───
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  displayName   String
  passwordHash  String
  role          Role      @default(USER)  // ADMIN, OPERATOR, USER, VIEWER
  department    String?
  active        Boolean   @default(true)
  mfaEnabled    Boolean   @default(false)
  mfaSecret     String?
  lastLogin     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  loginLogs          AuditLog[]              @relation("AuditLogUser")
  chatSessions       ChatSession[]          @relation("ChatSessionUser")
  groupChats         ChatGroupMember[]      @relation("ChatGroupMemberUser")
  systemAccess       SystemAccess[]         @relation("SystemAccessUser")
  benchmarkRuns      BenchmarkRun[]         @relation("BenchmarkRunUser")
  chatMessages       ChatMessage[]          @relation("ChatMessageUser")
  agentCommands      AgentCommand[]         @relation("AgentCommandUser")
  piCalls            PiCall[]              @relation("PiCallUser")
  memories           Memory[]              @relation("MemoryUser")
  ownedGroups        ChatGroup[]            @relation("ChatGroupOwner")
  queueTasks         QueueTask[]            @relation("QueueTaskUser")
  changeComments          ChangeComment[]              @relation("ChangeCommentUser")
  proposedChanges         ChangeProposal[]             @relation("ChangeProposalProposedBy")
  deployedChanges         ChangeProposal[]             @relation("ChangeProposalDeployedBy")
  deployedVersions        ChangeVersion[]              @relation("ChangeVersionDeployedBy")

  @@map("users")
}

enum Role {
  ADMIN
  OPERATOR
  USER
  VIEWER
}

// ─── AI Providers ───
model Provider {
  id            String    @id @default(uuid())
  name          String                           // "vllm-production", "ollama-lab", "openai-cloud"
  type          ProviderType                     // VLLM, OLLAMA, LLAMACPP, OPENAI, ANTHROPIC, OPENCLAW, HERMES
  baseUrl       String
  port          Int?
  apiKey        String?                          // Encrypted via AES-256-GCM with keyVersion
  apiKeyVersion Int       @default(1)            // For progressive key rotation
  model         String                           // Default model
  status        ProviderStatus                   // CONNECTED, DISCONNECTED, ERROR, TESTING
  lastChecked   DateTime?
  latencyMs     Int?
  config        Json?                            // Provider-specific config (vLLM args, Ollama params)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  models                    ProviderModel[]     @relation("ProviderModelProvider")
  benchmarkRuns             BenchmarkRun[]      @relation("BenchmarkRunProvider")
  chatSessions              ChatSession[]       @relation("ChatSessionProvider")
  agentChatSessions         ChatSession[]       @relation("ChatSessionAgentProvider")
  piCalls                   PiCall[]            @relation("PiCallProvider")
  agentConnections          AgentConnection[]   @relation("AgentConnectionProvider")
  queueTasks                QueueTask[]         @relation("QueueTaskProvider")

  @@unique([name, type])
  @@map("providers")
}

enum ProviderType {
  VLLM
  OLLAMA
  LLAMACPP
  OPENAI
  ANTHROPIC
  OPENCLAW
  HERMES
  CUSTOM
}

enum ProviderStatus {
  CONNECTED
  DISCONNECTED
  ERROR
  TESTING
}

// ─── Models (instances of a provider) ───
model ProviderModel {
  id            String    @id @default(uuid())
  providerId    String
  provider      Provider  @relation("ProviderModelProvider", fields: [providerId], references: [id], onDelete: Cascade)
  name          String                           // "Qwen3.6-35B-Q4_K_M", "llama3.1-8b"
  displayName   String?
  quantization  String?                          // Q4_K_M, Q8_K, F16, etc.
  sizeGB        Float?
  parameters    String?                          // "35B", "8B"
  source        ModelSource?                     // HUGGINGFACE, LOCAL, MANUAL
  downloadPath  String?                          // Path to GGUF on remote system
  status        ModelStatus                      // AVAILABLE, DOWNLOADING, DOWNLOAD_FAILED
  downloadProgress Float?                         // 0-100
  downloadedAt  DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  benchmarkRuns BenchmarkRun[]    @relation("BenchmarkRunModel")
  chatSessions  ChatSession[]     @relation("ChatSessionModel")
  queueTasks    QueueTask[]       @relation("QueueTaskModel")

  @@index([providerId, status])
  @@map("provider_models")
}

enum ModelStatus {
  AVAILABLE
  DOWNLOADING
  DOWNLOAD_FAILED
}

enum ModelSource {
  HUGGINGFACE
  LOCAL
  MANUAL
}

// ─── Remote Systems ───
model RemoteSystem {
  id            String    @id @default(uuid())
  name          String                           // "vllm-server-01", "dev-laptop"
  hostname      String                           // IP or hostname
  port          Int     @default(22)             // SSH port
  protocol      ProtocolType                    // SSH, LOCAL
  username      String                           // SSH username
  authType      AuthType                        // PASSWORD, SSH_KEY, KEY_PAIR
  encryptedPassword String?                      // AES-256-GCM encrypted with keyVersion
  encryptedKey  String?                          // Encrypted SSH private key or key path
  keyPassword   String?                          // Encrypted passphrase for SSH key
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  installations     SystemInstallation[]        @relation("SystemInstallSystem")
  hardwareInfo      HardwareInfo?               @relation("HardwareInfoSystem")
  systemAccess      SystemAccess[]              @relation("SystemAccessSystem")
  hfDownloads       HFDownload[]               @relation("HFDownloadSystem")

  @@map("remote_systems")
}

enum ProtocolType {
  SSH
  LOCAL
}

enum AuthType {
  PASSWORD
  SSH_KEY
  KEY_PAIR
}

// ─── System Installations ───
model SystemInstallation {
  id            String    @id @default(uuid())
  systemId      String
  system        RemoteSystem @relation("SystemInstallSystem", fields: [systemId], references: [id], onDelete: Cascade)
  softwareType  SoftwareType                     // VLLM, OLLAMA, LLAMACPP
  version       String                           // "0.6.3", "0.1.36"
  status        InstallationStatus               // INSTALLED, UPGRADING, FAILED
  installPath   String?
  port          Int?                             // Service port
  gpuCount      Int?
  gpuModels     Json?                            // ["NVIDIA A100", "RTX 4090"]
  ramGB         Float?
  modelPath     String?                          // Where downloaded models are stored
  logs          String?                          // Last install log output
  lastRunAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([systemId, softwareType])
  @@map("system_installations")
}

enum SoftwareType {
  VLLM
  OLLAMA
  LLAMACPP
}

enum InstallationStatus {
  INSTALLED
  UPGRADING
  FAILED
}

// ─── Hardware Info ───
model HardwareInfo {
  id            String    @id @default(uuid())
  systemId      String    @unique
  system        RemoteSystem @relation("HardwareInfoSystem", fields: [systemId], references: [id], onDelete: Cascade)
  cpuModel      String?
  cpuCores      Int?
  cpuThreads    Int?
  ramGB         Float?
  gpuInfo       Json?                              // [{ name, vramGB, pciBus }]
  os            String?
  kernel        String?
  dockerVersion String?
  whatllmRecs   Json?                              // Model recommendations from WhichLLM CLI
  analyzedAt    DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("hardware_info")
}

// ─── Benchmark Runs ───
model BenchmarkRun {
  id            String    @id @default(uuid())
  providerId    String
  provider      Provider  @relation("BenchmarkRunProvider", fields: [providerId], references: [id], onDelete: Cascade)
  modelId       String?
  model         ProviderModel? @relation("BenchmarkRunModel", fields: [modelId], references: [id])
  userId        String
  user          User      @relation("BenchmarkRunUser", fields: [userId], references: [id])
  name          String                           // "Speed test - Qwen 35B"
  benchmarkType BenchmarkType                    // SPEED, QUALITY, COMPARATIVE
  prompt        String?
  results       Json                               // { tokensPerSecond, totalTime, qualityScore, details }
  status        BenchmarkStatus                    // RUNNING, COMPLETED, FAILED
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  createdAt     DateTime  @default(now())

  @@index([providerId, status])
  @@map("benchmark_runs")
}

enum BenchmarkType {
  SPEED
  QUALITY
  COMPARATIVE
}

enum BenchmarkStatus {
  RUNNING
  COMPLETED
  FAILED
}

// ─── Chat Sessions ───
model ChatSession {
  id              String    @id @default(uuid())
  name            String?
  userId          String
  user            User      @relation("ChatSessionUser", fields: [userId], references: [id], onDelete: Cascade)
  providerId      String?
  provider        Provider? @relation("ChatSessionProvider", fields: [providerId], references: [id])
  modelId         String?
  model           ProviderModel? @relation("ChatSessionModel", fields: [modelId], references: [id])
  agentProviderId String?                            // OPENCLAW or HERMES agent platform
  agentProvider   Provider? @relation("ChatSessionAgentProvider", fields: [agentProviderId], references: [id])
  isAgentChat     Boolean   @default(false)          // Raw LLM vs agent chat (tool calling)
  systemPrompt    String?                            // Custom system prompt
  temperature     Float?
  maxTokens       Int?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  messages        ChatMessage[]               @relation("ChatMessageSession")
  toolLogs        AgentToolLog[]              @relation("AgentToolLogSession")

  @@index([userId, isActive])
  @@map("chat_sessions")
}

// ─── Chat Messages ───
model ChatMessage {
  id            String    @id @default(uuid())
  sessionId     String
  session       ChatSession @relation("ChatMessageSession", fields: [sessionId], references: [id], onDelete: Cascade)
  groupId       String?                                // Links group messages to ChatGroup
  group         ChatGroup? @relation("ChatMessageGroup", fields: [groupId], references: [id])
  userId        String                               // Who sent this message
  user          User      @relation("ChatMessageUser", fields: [userId], references: [id])
  role          MessageRole                        // USER, ASSISTANT, SYSTEM
  content       String
  modelUsed     String?
  createdAt     DateTime  @default(now())

  @@index([sessionId, createdAt])
  @@index([groupId, createdAt])
  @@map("chat_messages")
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

// ─── Chat Groups ───
model ChatGroup {
  id            String    @id @default(uuid())
  name          String
  description   String?
  ownerId       String
  owner         User      @relation("ChatGroupOwner", fields: [ownerId], references: [id])
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  members       ChatGroupMember[]     @relation("ChatGroupMembers")
  messages      ChatMessage[]         @relation("ChatMessageGroup")

  @@map("chat_groups")
}

model ChatGroupMember {
  id            String    @id @default(uuid())
  groupId       String
  group         ChatGroup @relation("ChatGroupMembers", fields: [groupId], references: [id], onDelete: Cascade)
  userId        String
  user          User      @relation("ChatGroupMemberUser", fields: [userId], references: [id], onDelete: Cascade)
  role          GroupMemberRole                     // MEMBER, MODERATOR, OWNER
  joinedAt      DateTime  @default(now())

  @@unique([groupId, userId])
  @@map("chat_group_members")
}

enum GroupMemberRole {
  MEMBER
  MODERATOR
  OWNER
}

// ─── Routing Rules ───
model RoutingRule {
  id            String    @id @default(uuid())
  name          String
  description   String?
  enabled       Boolean   @default(true)
  priority      Int     @default(0)                // Lower = higher priority
  condition     Json?                                // { modelType: "fast", quality: "high" }
  targetProviderId String?
  targetModelId String?
  routerMode    RouterMode?                          // When no match, use router
  weight        Int     @default(50)                 // For weighted routing
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([enabled, priority])
  @@map("routing_rules")
}

enum RouterMode {
  ROUND_ROBIN
  WEIGHTED
  LOWEST_LATENCY
  HIGHEST_QUALITY
  CUSTOM
}

// ─── Task Queue (BullMQ) ───
model QueueTask {
  id            String    @id @default(uuid())
  providerId    String
  provider      Provider  @relation("QueueTaskProvider", fields: [providerId], references: [id])
  modelId       String
  model         ProviderModel @relation("QueueTaskModel", fields: [modelId], references: [id])
  userId        String
  user          User      @relation("QueueTaskUser", fields: [userId], references: [id])
  prompt        String
  status        TaskStatus                    // WAITING, PROCESSING, COMPLETED, FAILED, RETRYING
  jobKey        String?                          // BullMQ job ID
  result        String?
  error         String?
  createdAt     DateTime  @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  priority      Int     @default(0)
  retryCount    Int     @default(0)

  @@index([status, priority])
  @@map("queue_tasks")
}

enum TaskStatus {
  WAITING
  PROCESSING
  COMPLETED
  FAILED
  RETRYING
}

// ─── System Access Controls ───
model SystemAccess {
  id            String    @id @default(uuid())
  systemId      String
  system        RemoteSystem @relation("SystemAccessSystem", fields: [systemId], references: [id], onDelete: Cascade)
  userId        String
  user          User      @relation("SystemAccessUser", fields: [userId], references: [id])
  accessLevel   AccessLevel                     // READ, WRITE, EXECUTE, ADMIN
  elevated      Boolean   @default(false)         // Currently elevated?
  elevatedUntil DateTime?
  grantedAt     DateTime  @default(now())
  grantedBy     String?                           // Admin who granted access
  @@unique([systemId, userId])
  @@map("system_access")
}

enum AccessLevel {
  READ
  WRITE
  EXECUTE
  ADMIN
}

// ─── Agent Connections ───
model AgentConnection {
  id              String    @id @default(uuid())
  providerId      String
  provider        Provider  @relation("AgentConnectionProvider", fields: [providerId], references: [id], onDelete: Cascade)
  agentType       String    // "openclaw" or "hermes"
  gatewayUrl      String    // Agent gateway URL
  authTokenEncrypted String? // Encrypted auth token
  authKeyVersion  Int       @default(1)            // Key rotation version
  status          AgentStatus @default(ONLINE)
  currentModel    String?
  activeSessions  Int       @default(0)
  toolsAvailable  Json?     // Available tools for this agent (from MCP)
  connectedAt     DateTime  @default(now())
  lastActivity    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  commands             AgentCommand[]          @relation("AgentCommandAgent")
  toolLogs             AgentToolLog[]          @relation("AgentToolLogAgent")

  @@unique([providerId, agentType])
  @@map("agent_connections")
}

enum AgentStatus {
  ONLINE
  OFFLINE
  ERROR
}

// ─── Agent Command Queue ───
model AgentCommand {
  id              String    @id @default(uuid())
  agentId         String
  agent           AgentConnection           @relation("AgentCommandAgent", fields: [agentId], references: [id])
  userId          String
  user            User                      @relation("AgentCommandUser", fields: [userId], references: [id])
  command         String                    // Natural language or structured command
  commandType     String                    // EXEC, BROWSE, EMAIL, FILESYSTEM, GIT, SSH, CUSTOM
  status          CommandStatus             @default(QUEUED)
  result          String?                   // Command output
  error           String?
  progress        Float?                    // 0-100
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime                  @default(now())

  toolLogs        AgentToolLog[]            @relation("AgentToolLogCommand")

  @@index([status, userId])
  @@map("agent_commands")
}

enum CommandStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

// ─── Agent Tool Execution Logs ───
model AgentToolLog {
  id              String    @id @default(uuid())
  sessionId       String?
  session         ChatSession? @relation("AgentToolLogSession", fields: [sessionId], references: [id])
  commandId       String?
  command         AgentCommand? @relation("AgentToolLogCommand", fields: [commandId], references: [id])
  agentId         String
  agent           AgentConnection             @relation("AgentToolLogAgent", fields: [agentId], references: [id])
  toolName        String    // e.g., "exec", "git", "web_fetch"
  toolParams      Json?     // Tool call parameters
  toolResult      Json?     // Tool execution result
  success         Boolean
  error           String?
  durationMs      Int?
  createdAt       DateTime  @default(now())

  @@index([agentId, createdAt])
  @@index([sessionId, createdAt])
  @@map("agent_tool_logs")
}

// ─── Pi Engine Calls ───
model PiCall {
  id              String    @id @default(uuid())
  providerId      String
  provider        Provider  @relation("PiCallProvider", fields: [providerId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation("PiCallUser", fields: [userId], references: [id], onDelete: Cascade)
  rawToolCall     Json      // Raw tool call from model (function name + args)
  translatedCall  Json      // Translated to provider-specific format
  executionStatus String    @default("QUEUED")
  result          Json?
  error           String?
  durationMs      Int?
  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  @@index([executionStatus, userId])
  @@map("pi_calls")
}

// ─── Memory (RAG) ───
model Memory {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation("MemoryUser", fields: [userId], references: [id], onDelete: Cascade)
  category        MemoryCategory                     // USER_PROFILE, LONG_TERM, etc.
  content         String                               // The actual text content
  metadata        Json?                                // { source: "chat", sessionId: "...", summary: "..." }
  relevanceScore  Float     @default(0.5)              // 0-1, used for ranking
  isPromoted      Boolean   @default(false)             // User-flagged as permanent
  isEditable      Boolean   @default(true)              // User can modify
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  accessedAt      DateTime?
  accessCount     Int       @default(0)
  ttlDays         Int?                                   // null = permanent

  vectorIndex           VectorIndex?              @relation("MemoryVectorIndex")
  pendingDeletions      PendingDeletion[]         @relation("PendingDeletionMemory")

  @@index([userId, category, createdAt])
  @@index([userId, isPromoted])
  @@map("memories")
}

enum MemoryCategory {
  USER_PROFILE
  CONVERSATION_HIGHLIGHTS
  LONG_TERM
  SESSION_CONTEXT
  TASK_STATE
  AGENT_BEHAVIOR
  SYSTEM_CONFIG
}

model VectorIndex {
  id              String    @id @default(uuid())
  memoryId        String    @unique
  memory          Memory    @relation("MemoryVectorIndex", fields: [memoryId], references: [id], onDelete: Cascade)
  vectorStore     String    // "sqlite-vec" | "pinecone" | "weaviate" | "chroma" | "qdrant"
  vectorId        String    // ID in the external vector store
  dimension       Int                       // Embedding dimension
  createdAt       DateTime  @default(now())

  @@index([vectorStore])
  @@map("vector_indexes")
}

// ─── Pending Memory Deletions (user consent before auto-prune) ───
model PendingDeletion {
  id            String    @id @default(uuid())
  memoryId      String
  memory        Memory    @relation("PendingDeletionMemory", fields: [memoryId], references: [id])
  reason        String    // "auto_prune", "context_pressure", "ttl_expired"
  scheduledFor  DateTime  // 24h from creation
  confirmedAt   DateTime?
  createdAt     DateTime  @default(now())

  @@index([scheduledFor])
  @@map("pending_deletions")
}

// ─── Change Proposals ───
model ChangeProposal {
  id              String    @id @default(uuid())
  title           String
  description     String
  category        ChangeCategory               // CONFIG_TWEAK, UI_IMPROVEMENT, AGENT_CONFIG, COMPONENT_UPDATE, SECURITY_PATCH
  type            ImprovementType              // AUTO_GENERATED | USER_SUBMITTED | SYSTEM_DETECTED
  source          String?                      // What triggered this (e.g., "memory_review_2026-06-05")
  proposedByUserId    String?                  // User ID or null if "system" generated
  proposedByUser      User?                    @relation("ChangeProposalProposedBy", fields: [proposedByUserId], references: [id])
  proposedBySystem    Boolean    @default(false) // true if auto-generated by engine
  priority            ChangePriority           // LOW, MEDIUM, HIGH, CRITICAL
  risk                ChangeRisk               // LOW, MEDIUM, HIGH
  status              ChangeStatus             // DRAFT, UNDER_REVIEW, APPROVED, DEPLOYED, REJECTED, ROLLED_BACK
  configDiff          Json                     // Structured diff: [{ field, oldValue, newValue, scope }]
  testResults         Json?                    // Results of automated tests
  userFeedback        Json?                    // User comments/ratings
  deployedAt          DateTime?
  deployedByUserId    String?                  // Who approved (null if auto-deployed by system)
  deployedByUser      User?                    @relation("ChangeProposalDeployedBy", fields: [deployedByUserId], references: [id])
  rolledBackAt    DateTime?
  rollbackReason  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  comments        ChangeComment[]             @relation("ChangeCommentProposal")
  versions        ChangeVersion[]             @relation("ChangeVersionProposal")

  settingsChanged     Setting[]              @relation("SettingChangeProposal")
  @@index([status, category])
  @@index([status, priority])
  @@map("change_proposals")
}

enum ChangeCategory {
  CONFIG_TWEAK
  UI_IMPROVEMENT
  AGENT_CONFIG
  COMPONENT_UPDATE
  SECURITY_PATCH
}

enum ImprovementType {
  AUTO_GENERATED
  USER_SUBMITTED
  SYSTEM_DETECTED
}

enum ChangePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ChangeRisk {
  LOW
  MEDIUM
  HIGH
}

enum ChangeStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  DEPLOYED
  REJECTED
  ROLLED_BACK
}

model ChangeComment {
  id              String    @id @default(uuid())
  proposalId      String
  proposal        ChangeProposal @relation("ChangeCommentProposal", fields: [proposalId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation("ChangeCommentUser", fields: [userId], references: [id])
  comment         String
  isApproved      Boolean?    // For approval/disapproval votes
  createdAt       DateTime  @default(now())

  @@index([proposalId, createdAt])
  @@map("change_comments")
}

model ChangeVersion {
  id              String    @id @default(uuid())
  proposalId      String
  proposal        ChangeProposal @relation("ChangeVersionProposal", fields: [proposalId], references: [id], onDelete: Cascade)
  version         Int
  configBefore    Json       // Full config state before change
  configAfter     Json       // Full config state after change
  filesModified   Json?      // List of files/paths changed
  tested          Boolean   @default(false)
  deployedAt      DateTime?
  deployedBy      String?      // Who approved the deployment
  deployedByUserId String?     // FK for proper join
  deployedByUser  User?      @relation("ChangeVersionDeployedBy", fields: [deployedByUserId], references: [id])
  createdAt       DateTime  @default(now())

  @@index([proposalId, version])
  @@map("change_versions")
}

// ─── System Log (self-improvement engine debug output) ───
model SystemLog {
  id              String    @id @default(uuid())
  level           String    // INFO, WARN, ERROR, DEBUG
  engine          String    // "memory_review", "usage_analytics", "dependency_scan"
  trigger         String    // What triggered this log entry
  data            Json?     // Input data for the engine decision
  reasoning       String?   // Why the engine made this decision
  createdAt       DateTime  @default(now())

  @@index([level, createdAt])
  @@index([engine, createdAt])
  @@map("system_logs")
}

// ─── Settings (key-value, like GRC) ───
model Setting {
  id              String    @id @default(uuid())
  key             String    @unique
  value           String
  category        String?
  lastChangeProposalId String?
  lastChangeProposal  ChangeProposal?         @relation("SettingChangeProposal", fields: [lastChangeProposalId], references: [id])
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@map("settings")
}

// ─── Audit Log ───
model AuditLog {
  id            String    @id @default(uuid())
  userId        String?
  user          User?     @relation("AuditLogUser", fields: [userId], references: [id])
  action        String
  entityType    String?
  entityId      String?
  details       Json?
  ipAddress     String?
  createdAt     DateTime  @default(now())

  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ─── Hugging Face Downloads ───
model HFDownload {
  id            String    @id @default(uuid())
  systemId      String
  system        RemoteSystem @relation("HFDownloadSystem", fields: [systemId], references: [id], onDelete: Cascade)
  modelId       String                            // HF model ID e.g. "meta-llama/Llama-3.1-8B"
  fileName      String                            // Filename on remote system
  status        HFDownloadStatus                  // QUEUED, DOWNLOADING, COMPLETED, FAILED
  progress      Float?
  speedMBps     Float?
  sizeTotal     Float?                           // MB
  sizeDownloaded Float?
  startedAt     DateTime?
  completedAt   DateTime?
  error         String?
  createdAt     DateTime  @default(now())

  @@index([status, systemId])
  @@map("hf_downloads")
}

enum HFDownloadStatus {
  QUEUED
  DOWNLOADING
  COMPLETED
  FAILED
}

// ─── Encryption Key Management ───
model EncryptionKey {
  id              String    @id @default(uuid())
  keyVersion      Int       @unique               // 1, 2, 3, ...
  keyType         KeyType   @default(MASTER)      // MASTER, DEK
  source          KeySource @default(ENV)          // ENV, AWS_KMS, GCP_KMS, VAULT, IMPORTED
  keyHint         String?   // Last 4 chars or KMS key ID for identification
  importedCert    String?   // PEM-encoded certificate (for imported keys)
  importedCertFingerprint String?  // SHA-256 fingerprint
  isActive        Boolean   @default(true)
  isPrimary       Boolean   @default(false)        // Only one primary key at a time
  createdAt       DateTime  @default(now())
  expiresAt       DateTime?
  revokedAt       DateTime?

  @@index([isActive])
  @@map("encryption_keys")
}

enum KeyType {
  MASTER
  DEK
}

enum KeySource {
  ENV
  AWS_KMS
  GCP_KMS
  VAULT
  IMPORTED
}
```

## 5. Agent Integration — OpenClaw & Hermes (Pi Architecture + MCP Tool Calling + Command Execution)

Overwatch is not just an inference orchestrator — it's a **control plane** for agent platforms. Users connect OpenClaw and/or Hermes agents to Overwatch, and from the website they can:

1. **Use agent tools that Overwatch does not have natively** — filesystem access, SSH, git, web browse, email, calendar, matrix messaging, etc.
2. **Execute Pi (OpenClaw's underlying architecture) tool calling** — Overwatch connects via MCP (Model Context Protocol) to OpenClaw's gateway. The Pi engine executes tool calls and returns results. Overwatch can also interpret tool-call output from any provider and route it through the MCP client for execution.
3. **Send arbitrary commands to agents for task execution** — natural language or structured commands that agents interpret and carry out.

### 5.1. MCP Protocol Integration

**OpenClaw speaks MCP.** Overwatch connects to OpenClaw's gateway via the MCP protocol (stdio for local, SSE/HTTP+SSE for remote). This is the single source of truth for tool discovery and invocation.

**Connection flow:**
1. User provides OpenClaw gateway URL + auth token
2. Overwatch establishes an MCP connection (stdio or SSE)
3. Overwatch calls MCP `tools/list` to discover available tools
4. Tools are stored in `AgentConnection.toolsAvailable` JSON and shown in the universal tool catalog

**Provider type:** `OPENCLAW` in the `Provider` model

**Pi call format (via MCP):**
```json
{
  "tool": "exec",
  "arguments": {
    "command": "ls -la /tmp",
    "timeoutMs": 30000
  }
}
```

Overwatch translates this into the MCP protocol format automatically.

### 5.2. Hermes Agent Connection

**Connection flow:**
1. User provides Hermes agent URL + API key
2. Overwatch validates connection
3. Credentials stored encrypted in `Provider` table

**Provider type:** `HERMES` in the `Provider` model

**Tool calling:**
- Hermes uses its own tool spec (different from MCP)
- Overwatch normalizes tool calls into a common internal format, then translates per-agent
- Universal tool catalog shows tools from both MCP (OpenClaw) AND Hermes

### 5.3. Agent Chat Interface

**New page:** `AgentChatPage.tsx`

- Chat window that can switch between:
  1. **Raw LLM chat** (vLLM/Ollama/llama.cpp — direct completion)
  2. **Agent chat** (OpenClaw/Hermes — LLM + MCP tool execution)
  3. **Hybrid chat** (model responds, detects tool-call intent, routes through MCP client)
- When agent mode is active, tool results are displayed inline in the chat stream via Socket.io
- Users can see the tool call, its arguments, and the result
- Tool results can be edited/retried before being finalized

**Chat session model update** (already in schema):
```prisma
model ChatSession {
  agentProviderId String?                      // OPENCLAW or HERMES provider
  agentProvider   Provider? @relation("ChatSessionAgentProvider", fields: [agentProviderId], references: [id])
  isAgentChat     Boolean   @default(false)    // Raw LLM vs agent chat
  toolLogs        AgentToolLog[]               // Tool calls in this session
  @@index([userId, isActive])
  @@map("chat_sessions")
}
```

### 5.4. Universal Tool Catalog

A browsable UI showing all available tools across all connected agents:
- Tool name + description + parameter schema
- Execution status (available/broken)
- "Run" button for quick testing (triggers MCP call or Hermes API, shows result)
- Per-user tool visibility based on RBAC

### 5.4. Remote System Setup (Prerequisite for Models)

Before downloading or managing models, users must configure **Remote Systems** (SSH connections) in the Systems page. This is a prerequisite for model downloads and remote model discovery.

### 5.5. Provider Auto-Discovery

When creating a new provider, after entering the host URL and API key, the system automatically connects to the provider and fetches:
- **vLLM/Ollama/llama.cpp**: List of running models via the provider's API (e.g., `/v1/models` or `/api/tags`)
- **OpenAI/Anthropic**: List of available models via their model listing API
- **OpenClaw/Hermes**: Connect via MCP and enumerate available tools

The fetched information is stored in the `Provider` and `ProviderModel` tables, so the user doesn't need to manually register every model.

### 5.6. Task Queue Integration

Long-running agent tasks are queued via BullMQ:
- Task status tracked in database + streamed via Socket.io
- Completion notifications
- Cancel support

---

## 6. Security Design

### 6.1. Authentication & Authorization

- JWT with bcrypt password hashing
- **4-tier RBAC:**
  - **ADMIN** — full access: users, settings, encryption keys, system access controls, audit logs, approve/reject changes
  - **OPERATOR** — can run benchmarks, manage providers/models, execute agent commands, manage chat groups, approve/reject changes (non-admin)
  - **USER** — chat, benchmarks, agent commands (on systems they have access to), submit improvement suggestions
  - **VIEWER** — read-only: view providers, benchmarks, chat history (not execute anything)
- Per-user rate limiting on all endpoints (strict tier on LLM proxy)
- Per-IP rate limiting on auth endpoints (brute-force protection)
- **CSRF tokens** on all state-changing routes (POST/PUT/DELETE)
- Optional MFA via TOTP
- Password policy: minimum 12 characters, complexity required for ADMIN/OPERATOR
- JWT expiry: 8h default, 24h for OPERATOR/Admin
- Refresh token rotation

### 6.2. Credential Encryption

**Envelope encryption pattern:**
- **Master key:** loaded from `ENCRYPTION_MASTER_KEY` env var, AWS KMS, GCP KMS, HashiCorp Vault, or imported certificate — configured in Settings
- **Per-record DEKs:** each encrypted field (apiKey, encryptedPassword, encryptedKey, keyPassword, authTokenEncrypted) uses its own randomly generated 256-bit DEK
- Master key encrypts DEKs; DEK encrypts field data via AES-256-GCM
- **Key versioning:** every encrypted field has a `KeyVersion` column (e.g., `apiKeyVersion`, `authKeyVersion`). When master key rotates, records are progressively re-encrypted (on-read, then on-write)
- **Certificate import:** Settings page allows importing TLS certificates (PEM format). SHA-256 fingerprint stored in `EncryptionKey.importedCertFingerprint`
- **EncryptionKey model:** tracks all keys with version, source (ENV/KMS/VAULT/IMPORTED), active status, primary flag, expiry
- **Settings management:** Encryption key management is a section in the Settings page:
  - Import new key (file upload for PEM/certificates)
  - Set primary key
  - View key fingerprints and expiry
  - Trigger progressive re-encryption of all records
  - Emergency key revocation

**Encryption service (`services/encryption.ts`):**
```typescript
class EncryptionService {
  // Load master key from configured source
  static async getMasterKey(version: number): Promise<Buffer>
  // Encrypt: generate DEK, encrypt with master, encrypt data with DEK
  static async encrypt(plaintext: string, keyVersion: number): Promise<EncryptedField>
  // Decrypt: get correct version of master key, decrypt DEK, decrypt data
  static async decrypt(encrypted: EncryptedField): Promise<string>
  // Check if key rotation is needed, trigger progressive re-encryption
  static async rotateKey(oldVersion: number, newVersion: number): Promise<void>
  // Generate DEK (256-bit random)
  static generateDEK(): Buffer
}
```

### 6.3. Remote System Security

- SSH connections use dedicated connection manager with:
  - **5-second default timeout** (configurable per-system)
  - **Health check ping** before execution
  - **Graceful degradation** when remote is unreachable
  - Connection pooling (reuse SSH sessions, max 5 per system)
- Command execution requires explicit user action (no auto-execution)
- System access controlled via `SystemAccess` model with 4 levels (READ, WRITE, EXECUTE, ADMIN)
- Elevations expire after configurable TTL
- Admin-only system management

### 6.4. Audit Trail

Every significant action logged:
- User login/logout
- Configuration changes
- Provider connections/disconnections
- Remote system access grants/revocations
- Chat session creation/deletion
- Agent tool invocations
- Improvement proposals + approvals/rejections
- Encryption key rotations
- Model downloads

---

## 7. API Endpoints

### 7.1. Authentication

```
POST   /api/auth/register          # Register (admin only if first user)
POST   /api/auth/login             # Login → JWT
POST   /api/auth/logout            # Revoke refresh token
POST   /api/auth/refresh           # Rotate refresh token
GET    /api/auth/me                # Current user profile
POST   /api/auth/csrf-token        # Get CSRF token
```

### 7.2. Users (Admin)

```
GET    /api/users                  # List users
POST   /api/users                  # Create user
GET    /api/users/:id              # Get user
PUT    /api/users/:id              # Update user
DELETE /api/users/:id              # Deactivate user
POST   /api/users/:id/elevate      # Grant temporary admin
POST   /api/users/:id/reset-password # Force password reset
```

### 7.3. Settings

```
GET    /api/settings               # Get all settings
PUT    /api/settings               # Update settings
GET    /api/settings/encryption    # Encryption key management
POST   /api/settings/encryption/import    # Import certificate/key
PUT    /api/settings/encryption/primary   # Set primary key
POST   /api/settings/encryption/rotate    # Trigger key rotation
```

### 7.4. Providers

```
GET    /api/providers              # List all providers + status
POST   /api/providers              # Add new provider
GET    /api/providers/:id          # Get provider details
PUT    /api/providers/:id          # Update provider config
DELETE /api/providers/:id          # Disconnect + remove
POST   /api/providers/:id/connect  # Test connection
GET    /api/providers/:id/models   # List models on this provider
POST   /api/providers/:id/discover # Auto-discover models from provider API
POST   /api/providers/:id/discover-all  # Discover + auto-register all found models as ProviderModel entries
```

### 7.5. Models

**Model auto-registration from provider:** After running `discover`, models are auto-created in the database. User can verify/edit model metadata (name, quantization, etc.).

**Remote model discovery:**
1. User first configures Remote Systems (SSH connections)
2. System scans remote filesystem for GGUF files (defaults to `/opt/models/gguf`)
3. User can browse remote filesystem recursively to select target folders
4. Model file introspection reads GGUF binary header to extract: model name, architecture, parameters, quantization, size, tokenizer
5. MMV/visual models (mmproj) are detected alongside their base models and linked
6. Model is registered as local (`source: LOCAL`) with the discovered path

**Model file introspection:** For local GGUF files, Overwatch reads the binary header fields (no loading the model into memory) to populate model metadata automatically. This works for llama.cpp, Ollama, and vLLM model formats.

```
GET    /api/models                 # List all models across providers
POST   /api/models                 # Register model (local/manual)
GET    /api/models/:id             # Get model details
PUT    /api/models/:id             # Update model config
DELETE /api/models/:id             # Remove model
GET    /api/models/:id/benchmarks  # Benchmark history for model

# Provider auto-discovery: fetch models from a provider
POST   /api/providers/:id/discover  # Auto-fetch models from provider API (e.g., /v1/models, /api/tags)

# Remote model discovery: scan a system for GGUF files
GET    /api/systems/:id/models      # Scan system filesystem for existing models
POST   /api/systems/:id/models/scan # Trigger recursive scan of a directory path
POST   /api/systems/:id/models/scan-tree  # Recursive filesystem browser on remote system

# Model file introspection: read model metadata from GGUF file
GET    /api/models/inspect?path=...&systemId=... # Read GGUF header fields (name, size, quant, arch)

# Hugging Face search & download
GET    /api/hf/search              # Search HF models (query + tags)
GET    /api/hf/models/:id          # Get HF model details
POST   /api/hf/download            # Queue download to system (target folder selectable)
GET    /api/hf/downloads           # My downloads
GET    /api/hf/downloads/:id/status  # Download progress (SSE)
```

### 7.6. Benchmark

```
GET    /api/benchmarks             # List runs
POST   /api/benchmarks             # Start benchmark
GET    /api/benchmarks/:id         # Get run results
GET    /api/benchmarks/:id/stream  # SSE stream for live results
DELETE /api/benchmarks/:id         # Delete run
GET    /api/benchmarks/compare     # Compare two runs
```

### 7.7. Chat

```
GET    /api/chat/sessions          # My chat sessions
POST   /api/chat/sessions          # Create new session
GET    /api/chat/sessions/:id      # Get session details
PUT    /api/chat/sessions/:id      # Update session config
DELETE /api/chat/sessions/:id      # Delete session
GET    /api/chat/sessions/:id/messages  # Get messages
POST   /api/chat/sessions/:id/messages  # Send message
GET    /api/chat/sessions/:id/stream  # SSE stream for LLM response tokens
GET    /api/chat/groups            # My groups
POST   /api/chat/groups            # Create group
GET    /api/chat/groups/:id        # Group details
PUT    /api/chat/groups/:id        # Update group
DELETE /api/chat/groups/:id        # Delete group
POST   /api/chat/groups/:id/members   # Add member
```

### 7.8. Routing

```
GET    /api/routing/rules          # List rules
POST   /api/routing/rules          # Add rule
GET    /api/routing/rules/:id      # Get rule
PUT    /api/routing/rules/:id      # Update rule
DELETE /api/routing/rules/:id      # Remove rule
GET    /api/routing/status         # Current routing status
```

### 7.9. Queue

```
GET    /api/queue/tasks            # List tasks
POST   /api/queue/tasks            # Enqueue task
GET    /api/queue/tasks/:id        # Get task status
POST   /api/queue/tasks/:id/cancel # Cancel task
GET    /api/queue/stats            # Queue depth, active, completed, failed
POST   /api/queue/route-manual     # Manually route a task to specific provider/model
```

### 7.10. Remote Systems

```
GET    /api/systems                # List remote systems
POST   /api/systems                # Add system
GET    /api/systems/:id            # Get system details
PUT    /api/systems/:id            # Update system config
DELETE /api/systems/:id            # Remove system
POST   /api/systems/:id/health     # Health check ping
POST   /api/systems/:id/install    # Start installation
GET    /api/systems/:id/install/logs  # Get install log (streamed)
POST   /api/systems/:id/hardware-scan  # Trigger hardware analysis (WhichLLM)
```

### 7.11. SSH & Install

```
POST   /api/ssh/exec               # Execute command on remote system
POST   /api/ssh/exec/stream        # Execute + stream output via Socket.io
POST   /api/install/upload-model   # Upload model file to remote system
```

### 7.12. WhichLLM (Hardware Analysis)

```
POST   /api/whatllm/analyze        # Run WhichLLM hardware analysis on system
GET    /api/whatllm/recommend      # Get WhichLLM model recommendations for system
GET    /api/whatllm/history        # Historical analysis results
```

### 7.13. AI Proxy (Unified LLM Completion)

```
POST   /api/ai-proxy/chat          # Standard chat completion (OpenAI-compatible)
POST   /api/ai-proxy/chat/stream   # Streaming chat completion
POST   /api/ai-proxy/embed         # Embeddings endpoint
POST   /api/ai-proxy/route         # Auto-route to best provider/model
POST   /api/ai-proxy/compare       # Multi-model comparison
```

### 7.14. Agent Integration (MCP Client)

```
GET    /api/agents/connections     # List connected agents
POST   /api/agents/connect         # Connect new agent
DELETE /api/agents/:id             # Disconnect agent
GET    /api/agents/:id/tools       # MCP tools list
POST   /api/agents/:id/tools       # Execute MCP tool call
GET    /api/agents/:id/status      # Agent status + active sessions
GET    /api/agents/:id/logs        # Agent execution logs
```

### 7.15. Agent Commands & Chat

```
GET    /api/agents/commands        # My command queue
POST   /api/agents/commands        # Queue command
GET    /api/agents/commands/:id    # Command status
POST   /api/agents/commands/:id/cancel  # Cancel command
GET    /api/agents/chat/sessions   # Agent chat sessions
POST   /api/agents/chat/sessions   # Create agent chat
GET    /api/agents/chat/sessions/:id  # Session details
GET    /api/agents/chat/sessions/:id/stream   # Stream tool results
```

### 7.16. Health

```
GET    /api/health                 # System health + all provider statuses
GET    /api/health/detailed        # Detailed health + latency metrics
```

### 7.17. Real-Time Transport (Socket.io)

**All real-time via Socket.io with JWT handshake auth.**

**Room conventions:**
- `chat:{sessionId}` — LLM response token streaming
- `install:{systemId}` — Remote install log output
- `user:{userId}` — Personal notifications (task complete, improvement approved)
- `queue:{providerId}` — Queue status updates
- `agent:{agentId}:tool` — Agent tool call streaming
- `user:{userId}:pending` — Pending memory deletion notifications

**Reconnect semantics:** Socket.io handles automatic reconnect with exponential backoff. On reconnect, client fetches latest state from REST API.

**Backpressure:** LLM token streaming is rate-limited to 30 tokens/second per connection. Agent tool calls are queued if the target agent is busy.

### 7.18. Admin

```
GET    /api/admin/audit            # Audit log viewer
GET    /api/admin/backups          # Backup status
POST   /api/admin/backups          # Trigger backup
GET    /api/admin/system-logs      # Self-improvement engine logs
DELETE /api/admin/system-logs/:id  # Clear log entry
GET    /api/admin/connections      # All active connections + stats
```

---

## 8. Frontend Pages

All pages use MUI v6 components, Zustand state management, and React Query for API layer.

### 8.1. Authentication

**LoginPage.tsx** — email + password + optional MFA code

### 8.2. Dashboard

**DashboardPage.tsx** — overview with cards for:
- Provider health status
- Active chat sessions
- Queue depth
- Recent improvements deployed
- Quick actions

### 8.3. Providers

**ProvidersPage.tsx** — add/connect/disconnect providers. Each card shows status, test button, model list, error messages.

### 8.4. Agents

**AgentsPage.tsx** — connect OpenClaw/Hermes agents. Show MCP tools list, active sessions, status.

### 8.5. Models

**ModelsPage.tsx** — model registry. Browse by provider. View config, run benchmarks, filter by type/status.

### 8.6. Tool Catalog

**ToolCatalogPage.tsx** — universal tool catalog. Browsable tool cards from all connected agents. Test any tool directly. Shows parameters, results.

### 8.7. Benchmark

**BenchmarkPage.tsx** — run benchmarks (speed + quality). View results. Compare runs. See benchmark history per model.

### 8.8. Chat

**ChatPage.tsx** — 1:1 chat with raw LLM (vLLM/Ollama/llama.cpp). Select model, configure params.

**AgentChatPage.tsx** — chat with agent (OpenClaw/Hermes). Tool calls displayed inline with expandable results. Socket.io streams tool call output in real-time.

**ChatGroupPage.tsx** — group chats. List groups, join/create, members management.

### 8.9. Routing

**RoutingPage.tsx** — configure routing rules (when to use which provider/model). Visual priority list.

### 8.10. Systems

**SystemsPage.tsx** — manage remote systems. Add/remove SSH connections. View hardware info. System access management.

**InstallPage.tsx** — install/upgrade wizard for LLM software on remote systems. Progress bar + streaming log output.

### 8.11. Hardware Analysis

**HardwarePage.tsx** — WhichLLM analysis results per system. Shows recommended models based on hardware. Historical comparison.

### 8.12. Commands

**CommandsPage.tsx** — queue commands for agents to execute. Track status in real-time via Socket.io.

### 8.13. Settings

**SettingsPage.tsx** — app settings with tabs:
- General (app name, language, theme)
- Provider defaults (default temp, max tokens)
- Chat defaults (system prompt, model defaults)
- Queue defaults (retry settings, timeout)
- **Encryption & Keys** (create/import keys, set primary, view fingerprints, rotate keys, trigger re-encryption)
- Certificate management (import certificates, view expiry, set notifications)
- Security (rate limits, password policy, MFA)

### 8.14. Admin

**AdminPage.tsx** — user/role management, system access controls, MFA settings.

### 8.15. Memory

**MemoryPage.tsx** — RAG memory: browse by category, search semantically, edit/promote/unpromote memories. Pending deletion queue (24-hour confirmation period).

**MemoryContextPage.tsx** — LLM context window control. Show budget used, relevance scores, pruning preview.

### 8.16. Self-Improvement

**SelfImprovementPage.tsx** — active proposals table (filterable by status, priority, type). Auto-generated proposals (one-click approve/modify for config tweaks only). User-suggested improvements (upvote/downvote). Metrics dashboard.

### 8.17. Change Management

**ChangeManagementPage.tsx** — full change history (searchable, filterable). Before/after comparison. Config versioning browser (view/rollback to any version). Deployment status dashboard.

### 8.18. Audit

**AuditPage.tsx** — audit log viewer. Filter by action, user, entity type, date range.

---

## 9. Queue & Routing Architecture

### 9.1. Task Queue (BullMQ + Redis)

All async operations are queued via BullMQ (not classic Bull):
- **Provider connection tests** — run periodically, queue health checks
- **Model downloads** — download from HF, queue by system
- **Installations** — install/upgrade LLM software on remote systems
- **Agent commands** — natural language commands queued for agents
- **Benchmarks** — run on provider/model, queue by priority
- **Memory indexing** — embed new memories
- **Improvement proposals** — cron-triggered analysis tasks

**Queue priorities:**
- HIGH (1) — install commands, emergency fixes
- NORMAL (0) — benchmarks, tool calls
- LOW (5) — memory indexing, analysis tasks

### 9.2. Multi-Model Traffic Routing

When a user sends a chat message or tool call:
1. Check exact-match routing rules (highest priority first)
2. If no match, use router mode (ROUND_ROBIN / WEIGHTED / LOWEST_LATENCY / HIGHEST_QUALITY)
3. If still no match, use provider default model
4. Fail gracefully: try next provider in priority order
5. If all providers unavailable, show error with status

**Router config per chat session:** can override global routing with a specific model/provider.

---

## 10. SSH & Remote System Management

### 10.1. Connection Management

- SSH connections managed by `SSHManager` service
- Connection pool: max 5 per system, auto-reconnect with exponential backoff
- **5-second default timeout** (configurable) on all commands
- **Health check ping** before execution (`systemctl is-active` or `ping`)
- Graceful degradation: if system unreachable, return clear error with last known status
- Session reuse: same SSH session for related commands

### 10.2. Remote Installations

- Install vLLM (pip + pip from source + conda)
- Install Ollama (script-based)
- Install llama.cpp (compile from source)
- Monitor progress via streaming logs (Socket.io)
- Automatic version detection after install

### 10.3. Hardware Analysis

**WhichLLM integration:**
- Overwatch invokes WhichLLM CLI on remote systems via SSH
- WhichLLM detects CPU, RAM, GPU (VRAM, model), OS, available disk
- Returns structured JSON with model recommendations (which GGUF quantization fits)
- Results stored in `HardwareInfo.whatllmRecs` JSON field
- **Built into website:** `HardwarePage.tsx` shows WhichLLM results as interactive cards, not just raw JSON
- If WhichLLM is not installed on the target system, fallback to manual hardware entry + heuristic recommendations
- Results cached for 30 days

---

## 11. Dev Workflow

### 11.1. Phased Build Order

**Phase 1 — Foundation (Weeks 1-2):**
- Project setup (TypeScript, Prisma, Express, Vite)
- Auth (login, register, JWT, MFA)
- Settings (key-value store + encryption key management UI)
- Encryption service (envelope encryption, key versioning, certificate import)
- Audit logging
- Basic UI shell (MUI theme, MainLayout, sidebar nav, routing)

**Phase 2 — Core Infrastructure (Weeks 3-4):**
- Provider connections (add/connect/disconnect/list)
- Model registry (register, update, remove)
- Remote systems (add/manage SSH connections)
- Socket.io setup (JWT auth, room conventions, basic reconnect)
- Hardware analysis (WhichLLM CLI integration on remote systems)

**Phase 3 — Chat & Proxy (Weeks 5-6):**
- AI proxy (unified chat completion endpoint)
- Chat sessions + messages (REST + Socket.io streaming)
- 1:1 chat UI (ChatPage.tsx)
- Benchmark runner (speed + quality, SSE streaming)
- Benchmark UI

**Phase 4 — Agent Integration (Weeks 7-8):**
- MCP client (stdio/SSE to OpenClaw gateway)
- Agent connections (connect/disconnect OpenClaw/Hermes)
- Tool catalog (discover + test tools)
- Agent chat (ChatPage.tsx with tool execution + Socket.io streaming)
- Command queue (queue + execute + track)

**Phase 5 — Routing & Queue (Weeks 9-10):**
- Routing rules (CRUD + active router)
- BullMQ integration (queue tasks, job management)
- Manual routing UI
- System health monitoring

**Phase 6 — Memory & Self-Improvement (Weeks 11-13):**
- Vector store integration (sqlite-vec or cloud)
- Memory CRUD + semantic search
- Context window management
- Memory pruning (with user consent queue)
- Self-improvement engine (config scope only)
- Change management system

**Phase 7 — Polish & Hardening (Weeks 14-15):**
- Dockerfile + docker-compose
- Documentation
- Security hardening (CSRF, rate limiting, penetration test)
- Performance optimization
- E2E testing

### 11.2. Development

```bash
# Install
pnpm install --filter overwatch-backend --filter overwatch-frontend

# Database setup
pnpm --filter overwatch-backend prisma generate
pnpm --filter overwatch-backend prisma db push

# Start dev servers
pnpm --filter overwatch-backend dev      # Express on :4000
pnpm --filter overwatch-frontend dev     # Vite on :5173 (proxies /api to :4000)
```

### 11.3. Production

```bash
# Build
pnpm --filter overwatch-backend build
pnpm --filter overwatch-frontend build

# Start
NODE_ENV=production PORT=4000 node overwatch-backend/dist/index.js
```

### 11.4. Docker

Multi-stage Dockerfile for the app + optional vLLM container:
```dockerfile
# ===== Phase 1: Build =====
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter overwatch-backend build
RUN pnpm --filter overwatch-frontend build

# ===== Phase 2: Runtime =====
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/overwatch-backend/dist ./dist
COPY --from=build /app/overwatch-frontend/dist ./frontend/dist
RUN corepack enable && pnpm install --prod --filter overwatch-backend
USER node
CMD ["node", "dist/index.js"]
```

docker-compose for development (app + Redis + PostgreSQL):
```yaml
version: "3.9"
services:
  app:
    build: .
    ports: ["4000:4000"]
    env_file: .env
    depends_on: [redis, postgres]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: overwatch
      POSTGRES_PASSWORD: change_me
      POSTGRES_DB: overwatch
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
```

For vLLM deployment, a separate Dockerfile wraps the vLLM server with GPU support (nvidia-docker / NVIDIA Container Runtime). This is covered in the install wizard, not the core app Dockerfile.

---

## 12. RAG Memory System — Long-Term Memory with Controlled Context

### 12.1. Vector Database

**v1 (local):** `sqlite-vec` (actively maintained by same author as sqlite-vss, no abandoned native extension issues)
**Cloud options:** Pinecone, Weaviate, Chroma (HTTP), Qdrant

Vectors are NOT stored in the Prisma schema. They live in the external vector store, referenced by `VectorIndex.vectorId`.

### 12.2. Memory Categories

7 categories with different TTLs and pruning rules:

| Category | TTL | Auto-Prune | Notes |
|----------|-----|-----------|-------|
| `USER_PROFILE` | Permanent | No | User info, preferences, context |
| `CONVERSATION_HIGHLIGHTS` | 90 days | Yes | Key moments from chats |
| `LONG_TERM` | No TTL | No | Promoted by user, never auto-pruned |
| `SESSION_CONTEXT` | 24h | Yes | Current session context |
| `TASK_STATE` | 7 days | Yes | Ongoing task tracking |
| `AGENT_BEHAVIOR` | 30 days | Yes | Agent patterns, learnings |
| `SYSTEM_CONFIG` | Permanent | No | Config state for change tracking |

### 12.3. Context Window Control

Each LLM call gets 128K token budget (configurable):
1. Fetch memories by relevance score + category priority
2. Sort by relevance × recency
3. Embed the current query + candidate memories
4. Vector similarity search returns top-K
5. Select until context budget is filled
6. Budget-aware truncation: if over budget, drop lowest-relevance memories

### 12.4. User Memory Curation

- Users can view, edit, promote/unpromote any memory
- Promoted memories stay permanent (not auto-pruned)
- **Auto-prune with user consent:** low-relevance memories go into a "pending deletion" queue for 24 hours. User can review and restore before deletion. This is not silent.

### 12.5. Memory Context API

```bash
GET    /api/memory-context/sessions   # Active sessions with context status
POST   /api/memory-context/session    # Create context window for session
GET    /api/memory-context/session/:id # Current context window
GET    /api/memory-context/session/:id/preview # What will be included
DELETE /api/memory-context/session/:id # Close context window
```

---

## 13. Self-Improvement Engine & Change Management

### 13.1. v1 Scope — Configuration Only

**CRITICAL RESTRICTION:** The self-improvement engine in v1 is scoped to **configuration/preference tweaks only.** It can modify:
- Setting table entries (app settings, defaults)
- RoutingRule ordering and parameters
- Model parameter defaults (temperature, max tokens)
- Chat system prompt templates

It does **NOT** modify source code. No file generation, no template replacement, no code deployment. Anything touching code goes through Git + CI + manual review — not through this app.

**Removed categories (dangerous):** FEATURE_ADDITION, INFRASTRUCTURE changes.

### 13.2. Threat Model

- If any LLM ingests user messages and produces improvement proposals, a malicious prompt could engineer low-risk-looking changes. Scoping to config-only eliminates this attack surface for v1.
- All proposals require ADMIN or OPERATOR approval.
- The self-improvement engine has its own audit trail via `SystemLog`.

### 13.3. Engine Workflow

```
1. TRIGGER — cron job runs (hourly/daily/weekly/monthly)
2. ANALYZE — engine reads metrics (error rates, memory insights, usage patterns)
3. PROPOSE — if improvement detected, create ChangeProposal (category: CONFIG_TWEAK only)
4. REVIEW — ADMIN/OPERATOR reviews proposal, can approve, reject, or modify
5. DEPLOY — if approved, apply config change, record in ChangeVersion
6. AUDIT — log everything in SystemLog + AuditLog
```

### 13.4. Structured Config Diffs

`ChangeProposal.configDiff` is a structured array (not a raw JSON blob):
```json
[
  { "field": "chat.systemPrompt", "oldValue": "You are a helpful assistant.", "newValue": "You are a helpful assistant specialized in..." }
]
```

### 13.5. Change Versioning

All config changes versioned like Git commits:
- Each change gets a `ChangeVersion` with full before/after state
- Rollback is applying a previous version
- Config stored as complete snapshots (not diffs) in `ChangeVersion.configBefore/configAfter`
- FilesModified tracked when relevant

### 13.6. Cron Schedule

```
Hourly cron:
  - Check error rates, performance metrics
  - Scan for security updates
  - Check dependency versions

Daily cron:
  - Review memory highlights → summarize → promote to long-term
  - Generate improvement proposals from memory analysis
  - Prune low-relevance memories (user-reviewable pending queue)

Weekly cron:
  - Comprehensive usage pattern analysis
  - Full improvement proposal review
  - Security audit of all configurations
  - Memory growth analysis

Monthly cron:
  - Architecture review
  - Dependency audit
  - Schema optimization suggestions
  - Memory archival (move old memories to cold storage)
```

### 13.7. Engine Debug Logging

`SystemLog` model tracks every engine decision:
```typescript
// services/system-log.ts
interface SystemLogEntry {
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"
  engine: "memory_review" | "usage_analytics" | "dependency_scan" | "security_audit"
  trigger: string
  data?: Json
  reasoning?: string
  createdAt: Date
}
```

### 13.8. Improvement UI Components

**SelfImprovementPage.tsx:**
- Active proposals table (filterable by status, priority, type)
- Auto-generated proposals (with one-click "approve" or "modify" for config tweaks)
- User-suggested improvements (with upvote/downvote)
- Improvement metrics dashboard
- "What changed" timeline

**ChangeManagementPage.tsx:**
- Full change history (searchable, filterable)
- Before/after comparison view for any change
- Config versioning browser (view/rollback to any version)
- Deployment status dashboard
- Audit trail with who approved/changed what and when

**ImprovementPreview.tsx:**
- Live preview of proposed UI/config changes
- Toggle between "before" and "after" state
- Apply to test environment for validation before production deployment

---

## 14. Migration from GRC Codebase

The GRC codebase provides a strong foundation. Reusable patterns:

### Reuse Directly
- **Auth middleware** (`auth.ts`): JWT verification, role checks, write access enforcement
- **Error handler** (`errorHandler.ts`): Central error handling
- **Audit logging** (`audit.ts`): Audit service with Prisma
- **Settings pattern** (`settings.ts`): Key-value settings with category support
- **Frontend patterns**: Zustand auth store, react-query API layer, MUI theme, MainLayout drawer
- **Prisma patterns**: UUID primary keys, DateTime defaults (via `@default(now())`), soft deletes via active flag
- **File upload**: multer + pdf-parse + mammoth from GRC

### Adapt
- **GRC's AI routes** → **Overwatch's provider/chat routes** (broader provider support, queue integration)
- **GRC's settings** → **Overwatch's provider config** (expand to all LLM providers, add full parameter syntax)
- **GRC's RBAC** → **Overwatch's 4-tier RBAC** (ADMIN/OPERATOR/USER/VIEWER) + system access controls
- **GRC's Prisma models** → **Overwatch's models** (new schema, entirely different domain)

### Don't Reuse
- GRC's GRC-specific routes (assets, vendors, controls, policies, risks, findings, etc.)
- GRC's FDIC integration
- GRC's SentinelOne/fortifydata services
- GRC's network/facility models
- GRC's frontend pages (all new pages)

---

## Appendix A: Technology Decision Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Queue | **BullMQ** (not Bull) | Actively maintained, better TS support, async throughout |
| Database | **PostgreSQL** primary, **SQLite + WAL** for v1 pilot | Multi-user safe; SQLite OK for pilot if WAL enabled |
| Vector DB | **sqlite-vec** (not sqlite-vss) | Actively maintained, same author as sqlite-vss, no abandoned extension |
| Real-time | **Socket.io** + JWT | Standard, room-based scoping, built-in reconnect, backpressure |
| MCP | **MCP protocol** (stdio/SSE) | OpenClaw speaks MCP — don't invent a new wire format |
| Encryption | **Envelope encryption** with key versioning | Per-record DEKs, KMS support, graceful rotation |
| Self-improve v1 | **Config-only** | Eliminate code injection attack surface |
| Health checks | **Timeout + ping + degrade** | SSH connections can hang; graceful fallback required |
| WhichLLM | **CLI invoked via SSH** | Hardware analysis runs on remote systems, results shown in web UI |
| Docker | **Multi-stage for app** + separate vLLM container | Slim runtime image, GPU support for LLM server separately |

