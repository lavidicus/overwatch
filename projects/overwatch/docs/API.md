# Overwatch API Reference

Complete API endpoint documentation for the Overwatch platform.

**Base URL:** `http://localhost:3000/api`

**Authentication:** Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 🔐 Authentication Endpoints

### POST `/auth/register`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "displayName": "User Name",
  "password": "securepassword123",
  "department": "Engineering"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "User Name",
    "role": "USER"
  }
}
```

---

### POST `/auth/login`
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "User Name",
    "role": "USER"
  }
}
```

---

### POST `/auth/logout`
Invalidate current session.

**Response:** `200 OK`
```json
{ "ok": true }
```

---

## 👥 AI Panels (Group Chat) Endpoints

### GET `/chat/groups`
List all panels owned by the current user.

**Response:** `200 OK`
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "Security Review Panel",
      "description": "Reviews security implications",
      "maxRounds": 5,
      "agentCount": 4,
      "roundCount": 12,
      "createdAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-06-07T00:00:00Z",
      "agents": [
        { "agentName": "Alice", "role": "facilitator" },
        { "agentName": "Bob", "role": "critic" }
      ]
    }
  ]
}
```

---

### POST `/chat/groups`
Create a new AI panel with agents.

**Request:**
```json
{
  "name": "Security Review Panel",
  "description": "Reviews security implications",
  "maxRounds": 5,
  "judgeProviderId": "uuid-of-provider",
  "judgeModelId": "uuid-of-model",
  "allowToolCalls": true,
  "requireToolApproval": true,
  "allowedToolIds": ["uuid1", "uuid2"],
  "agents": [
    {
      "agentName": "Security Lead",
      "providerId": "uuid",
      "modelId": "uuid",
      "role": "facilitator",
      "systemPrompt": "You are a security expert...",
      "position": 0
    }
  ]
}
```

**Field Notes:**
- `judgeModelId` is optional; if omitted, first available model from provider is auto-selected
- `allowedToolIds`: null or empty = all enabled tools allowed
- `position`: agent order in discussion (0-indexed)

**Response:** `201 Created`
```json
{
  "group": {
    "id": "uuid",
    "name": "Security Review Panel",
    "agents": [...],
    "roundCount": 0,
    "lastRound": null
  }
}
```

---

### GET `/chat/groups/:id`
Get full details of a specific panel.

**Response:** `200 OK`
```json
{
  "group": {
    "id": "uuid",
    "name": "Security Review Panel",
    "description": "...",
    "maxRounds": 5,
    "judgeProviderId": "uuid",
    "judgeModelId": "uuid",
    "allowToolCalls": true,
    "requireToolApproval": true,
    "allowedToolIds": ["uuid1"],
    "agents": [
      {
        "id": "uuid",
        "agentName": "Security Lead",
        "role": "facilitator",
        "providerId": "uuid",
        "providerName": "vLLM",
        "modelId": "uuid",
        "modelName": "Qwen3.5",
        "systemPrompt": "...",
        "position": 0
      }
    ],
    "lastRound": {
      "id": "uuid",
      "roundNumber": 3,
      "topic": "...",
      "status": "REACHED_CONSENSUS",
      "finalConsensus": "...",
      "createdAt": "2026-06-07T00:00:00Z"
    },
    "roundCount": 3
  }
}
```

---

### PATCH `/chat/groups/:id`
Update panel configuration. Replaces agent roster if provided.

**Request:**
```json
{
  "name": "Updated Panel Name",
  "maxRounds": 7,
  "judgeProviderId": "new-uuid",
  "agents": [
    {
      "agentName": "New Agent",
      "providerId": "uuid",
      "modelId": "uuid",
      "role": "advisor"
    }
  ]
}
```

**Note:** All fields are optional. Only provided fields are updated. If `agents` is provided, existing agents are replaced.

**Response:** `200 OK`
```json
{
  "group": { ... }
}
```

---

### DELETE `/chat/groups/:id`
Delete a panel and all its rounds.

**Response:** `200 OK`
```json
{ "ok": true }
```

---

### POST `/chat/groups/:id/consensus`
Run a consensus round with the panel.

**Request:**
```json
{
  "topic": "What are the security implications of feature X?",
  "sessionId": "optional-chat-session-uuid",
  "maxRounds": 5
}
```

**Response:** `200 OK` (after consensus completes)
```json
{
  "status": "REACHED_CONSENSUS",
  "totalRounds": 3,
  "finalConsensus": "The panel agrees that...",
  "transcript": [
    {
      "roundNumber": 1,
      "messages": [
        {
          "agentName": "Security Lead",
          "role": "response",
          "message": "I think..."
        }
      ],
      "judgeAnalysis": "No consensus yet..."
    }
  ]
}
```

**Possible status values:**
- `REACHED_CONSENSUS` - Panel agreed
- `FAILED` - No consensus after max rounds

---

### GET `/chat/groups/:id/history`
Get all rounds and messages for a panel.

**Response:** `200 OK`
```json
{
  "groupId": "uuid",
  "rounds": [
    {
      "id": "uuid",
      "roundNumber": 1,
      "topic": "...",
      "status": "NO_CONSENSUS",
      "finalConsensus": null,
      "judgeAnalysis": "...",
      "createdAt": "2026-06-07T00:00:00Z",
      "endedAt": "2026-06-07T00:05:00Z",
      "messages": [
        {
          "id": "uuid",
          "agentName": "Agent 1",
          "role": "response",
          "message": "...",
          "position": 0
        }
      ]
    }
  ]
}
```

---

### GET `/chat/groups/agents/available`
List available provider models for panel agents.

**Response:** `200 OK`
```json
{
  "models": [
    {
      "modelId": "uuid",
      "modelName": "Qwen3.5",
      "displayName": "Qwen 3.5 35B",
      "providerId": "uuid",
      "providerName": "vLLM",
      "providerType": "VLLM",
      "providerStatus": "READY"
    }
  ]
}
```

---

## 💬 Individual Chat Endpoints

### GET `/chat/sessions`
List user's chat sessions.

**Query Parameters:**
- `active` (boolean) - Filter by active status

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "uuid",
      "name": "Project Discussion",
      "isAgentChat": false,
      "isGroupChat": false,
      "providerId": "uuid",
      "modelId": "uuid",
      "isActive": true,
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/chat/sessions`
Create a new chat session.

**Request:**
```json
{
  "name": "Project Discussion",
  "providerId": "uuid",
  "modelId": "uuid",
  "systemPrompt": "You are a helpful assistant...",
  "temperature": 0.7,
  "maxTokens": 2048,
  "allowedToolIds": ["uuid1"]
}
```

**Response:** `201 Created`
```json
{
  "session": { ... }
}
```

---

### GET `/chat/sessions/:id/messages`
Get messages in a chat session.

**Query Parameters:**
- `limit` (number) - Max messages to return
- `before` (ISO date) - Messages before this timestamp

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "Hello!",
      "createdAt": "2026-06-07T00:00:00Z"
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "Hi there!",
      "modelUsed": "Qwen3.5",
      "createdAt": "2026-06-07T00:00:05Z"
    }
  ]
}
```

---

### POST `/chat/sessions/:id/messages`
Send a message to a chat session.

**Request:**
```json
{
  "content": "What's the weather like?",
  "toolIds": ["weather-tool-uuid"]
}
```

**Response:** `200 OK`
```json
{
  "message": {
    "id": "uuid",
    "role": "ASSISTANT",
    "content": "The weather is...",
    "toolCalls": [...]
  }
}
```

---

## 🤖 Provider Management Endpoints

### GET `/providers`
List all configured AI providers.

**Response:** `200 OK`
```json
{
  "providers": [
    {
      "id": "uuid",
      "name": "vLLM Server",
      "type": "VLLM",
      "baseUrl": "http://vllm:11434",
      "port": 11434,
      "model": "Qwen3.5",
      "status": "READY",
      "latencyMs": 45,
      "lastChecked": "2026-06-07T16:00:00Z"
    }
  ]
}
```

---

### POST `/providers`
Add a new AI provider.

**Request:**
```json
{
  "name": "My Ollama Server",
  "type": "OLLAMA",
  "baseUrl": "http://192.168.1.100",
  "port": 11434,
  "model": "llama3.2",
  "config": {
    "timeout": 30000
  }
}
```

**Response:** `201 Created`
```json
{
  "provider": { ... }
}
```

---

### PATCH `/providers/:id`
Update provider configuration.

**Request:**
```json
{
  "name": "Updated Name",
  "status": "DISCONNECTED"
}
```

**Response:** `200 OK`
```json
{
  "provider": { ... }
}
```

---

### DELETE `/providers/:id`
Remove a provider.

**Response:** `200 OK`
```json
{ "ok": true }
```

---

### POST `/providers/:id/test`
Test provider connectivity.

**Response:** `200 OK`
```json
{
  "status": "READY",
  "latencyMs": 42,
  "message": "Provider is responsive"
}
```

---

## 📦 Model Management Endpoints

### GET `/models`
List all models across all providers.

**Query Parameters:**
- `providerId` (uuid) - Filter by provider
- `status` (AVAILABLE|DOWNLOADING) - Filter by status

**Response:** `200 OK`
```json
{
  "models": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "name": "Qwen3.5",
      "displayName": "Qwen 3.5 35B Q4_K_M",
      "quantization": "Q4_K_M",
      "sizeGB": 22.5,
      "status": "AVAILABLE",
      "downloadedAt": "2026-06-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/models`
Register/download a new model.

**Request:**
```json
{
  "providerId": "uuid",
  "name": "llama3.2",
  "source": "HUGGINGFACE",
  "modelId": "meta-llama/Llama-3.2-3B-Instruct"
}
```

**Response:** `201 Created`
```json
{
  "model": { ... }
}
```

---

## 🛠️ Tool System Endpoints

### GET `/tools`
List all registered tools.

**Response:** `200 OK`
```json
{
  "tools": [
    {
      "id": "uuid",
      "name": "ssh_execute",
      "description": "Execute SSH commands on remote hosts",
      "category": "system",
      "schema": {
        "type": "object",
        "properties": {
          "host": {"type": "string"},
          "command": {"type": "string"}
        }
      },
      "enabled": true,
      "requiresApproval": true
    }
  ]
}
```

---

### POST `/tools`
Register a new tool.

**Request:**
```json
{
  "name": "weather_lookup",
  "description": "Get weather for a location",
  "category": "data",
  "schema": {...},
  "enabled": true,
  "requiresApproval": false
}
```

**Response:** `201 Created`
```json
{
  "tool": { ... }
}
```

---

### PATCH `/tools/:id`
Update tool configuration.

**Request:**
```json
{
  "enabled": false,
  "requiresApproval": true
}
```

**Response:** `200 OK`
```json
{
  "tool": { ... }
}
```

---

### DELETE `/tools/:id`
Remove a tool.

**Response:** `200 OK`
```json
{ "ok": true }
```

---

## 🧠 Memory System Endpoints

### GET `/memory`
List user's memories.

**Query Parameters:**
- `category` (USER_PROFILE|CONVERSATION_HIGHLIGHTS|LONG_TERM|...)
- `limit` (number)
- `search` (string) - Full-text search

**Response:** `200 OK`
```json
{
  "memories": [
    {
      "id": "uuid",
      "category": "CONVERSATION_HIGHLIGHTS",
      "content": "User prefers TypeScript over JavaScript",
      "relevanceScore": 0.85,
      "isPromoted": true,
      "accessCount": 12,
      "createdAt": "2026-06-01T00:00:00Z",
      "accessedAt": "2026-06-07T00:00:00Z"
    }
  ]
}
```

---

### POST `/memory`
Create a new memory.

**Request:**
```json
{
  "category": "USER_PROFILE",
  "content": "User works in cybersecurity",
  "metadata": {
    "source": "conversation",
    "confidence": 0.9
  }
}
```

**Response:** `201 Created`
```json
{
  "memory": { ... }
}
```

---

### DELETE `/memory/:id`
Delete a memory.

**Response:** `200 OK`
```json
{ "ok": true }
```

---

## 📊 Benchmark Endpoints

### GET `/benchmarks`
List benchmark runs.

**Response:** `200 OK`
```json
{
  "runs": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "modelId": "uuid",
      "name": "Speed Test vLLM",
      "benchmarkType": "SPEED",
      "status": "COMPLETED",
      "results": {
        "tokensPerSecond": 53.2,
        "promptTokensPerSecond": 198.5
      },
      "startedAt": "2026-06-07T00:00:00Z",
      "completedAt": "2026-06-07T00:10:00Z"
    }
  ]
}
```

---

### POST `/benchmarks`
Start a new benchmark run.

**Request:**
```json
{
  "providerId": "uuid",
  "modelId": "uuid",
  "benchmarkType": "SPEED",
  "name": "Custom Speed Test"
}
```

**Response:** `201 Created`
```json
{
  "run": { ... }
}
```

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:3000`

### Authentication
```javascript
socket.on('connect', () => {
  socket.emit('auth', { token: 'jwt-token-here' });
});
```

### Group Chat Events

**Join a group room:**
```javascript
socket.emit('group:join', groupId);
```

**Leave a group room:**
```javascript
socket.emit('group:leave', groupId);
```

**Consensus Events (server → client):**

| Event | Payload | Description |
|-------|---------|-------------|
| `group:consensus:start` | `{groupId, topic, agents}` | Consensus round starting |
| `group:round:start` | `{groupId, roundId, roundNumber}` | New round beginning |
| `group:round:agent:start` | `{groupId, agentName, role}` | Agent beginning response |
| `group:round:agent:tool_call` | `{groupId, agentName, name, args, invocationId, requiresApproval}` | Tool call initiated |
| `group:round:agent:tool_result` | `{groupId, agentName, name, ok, result, error}` | Tool call completed |
| `group:round:agent:complete` | `{groupId, agentName, message, error}` | Agent finished response |
| `group:round:complete` | `{groupId, roundId, reachedConsensus, judgeAnalysis, finalConsensus}` | Round completed |
| `group:consensus:complete` | `{groupId}` | All consensus rounds done |

**Tool Approval Events (client → server):**
```javascript
// Approve a tool call
socket.emit('group:tool:approve', {
  groupId,
  invocationId,
  toolName
});

// Reject a tool call
socket.emit('group:tool:reject', {
  groupId,
  invocationId,
  toolName,
  error: 'User rejected'
});
```

---

## 🔒 Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## 📝 Rate Limiting

API endpoints are rate-limited:
- **Auth endpoints:** 5 requests per minute
- **General API:** 100 requests per minute per user

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1717776000
```

---

*For implementation examples, see the frontend source code in `frontend/src/api/`*
