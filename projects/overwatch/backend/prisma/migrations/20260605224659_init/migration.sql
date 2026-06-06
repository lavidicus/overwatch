-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "port" INTEGER,
    "apiKey" TEXT,
    "apiKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastChecked" DATETIME,
    "latencyMs" INTEGER,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "provider_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "quantization" TEXT,
    "sizeGB" REAL,
    "parameters" TEXT,
    "source" TEXT,
    "downloadPath" TEXT,
    "status" TEXT NOT NULL,
    "downloadProgress" REAL,
    "downloadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "provider_models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "remote_systems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "protocol" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "encryptedPassword" TEXT,
    "encryptedKey" TEXT,
    "keyPassword" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_installations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "softwareType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "installPath" TEXT,
    "port" INTEGER,
    "gpuCount" INTEGER,
    "gpuModels" JSONB,
    "ramGB" REAL,
    "modelPath" TEXT,
    "logs" TEXT,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "system_installations_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "remote_systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hardware_info" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "cpuModel" TEXT,
    "cpuCores" INTEGER,
    "cpuThreads" INTEGER,
    "ramGB" REAL,
    "gpuInfo" JSONB,
    "os" TEXT,
    "kernel" TEXT,
    "dockerVersion" TEXT,
    "whatllmRecs" JSONB,
    "analyzedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hardware_info_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "remote_systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "benchmark_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "benchmarkType" TEXT NOT NULL,
    "prompt" TEXT,
    "results" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "benchmark_runs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "benchmark_runs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "provider_models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "benchmark_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "agentProviderId" TEXT,
    "isAgentChat" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT,
    "temperature" REAL,
    "maxTokens" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "provider_models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_agentProviderId_fkey" FOREIGN KEY ("agentProviderId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "groupId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "targetProviderId" TEXT,
    "targetModelId" TEXT,
    "routerMode" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "queue_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "jobKey" TEXT,
    "result" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "queue_tasks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "queue_tasks_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "provider_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "queue_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "elevated" BOOLEAN NOT NULL DEFAULT false,
    "elevatedUntil" DATETIME,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    CONSTRAINT "system_access_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "remote_systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "system_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "gatewayUrl" TEXT NOT NULL,
    "authTokenEncrypted" TEXT,
    "authKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "currentModel" TEXT,
    "activeSessions" INTEGER NOT NULL DEFAULT 0,
    "toolsAvailable" JSONB,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "agent_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_commands" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "commandType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "result" TEXT,
    "error" TEXT,
    "progress" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_commands_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_connections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agent_commands_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_tool_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "commandId" TEXT,
    "agentId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolParams" JSONB,
    "toolResult" JSONB,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_tool_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agent_tool_logs_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "agent_commands" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agent_tool_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_connections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pi_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawToolCall" JSONB NOT NULL,
    "translatedCall" JSONB NOT NULL,
    "executionStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "pi_calls_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pi_calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "relevanceScore" REAL NOT NULL DEFAULT 0.5,
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accessedAt" DATETIME,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "ttlDays" INTEGER,
    CONSTRAINT "memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vector_indexes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT NOT NULL,
    "vectorStore" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vector_indexes_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "memories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pending_deletions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_deletions_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "memories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "change_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "proposedByUserId" TEXT,
    "proposedBySystem" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "configDiff" JSONB NOT NULL,
    "testResults" JSONB,
    "userFeedback" JSONB,
    "deployedAt" DATETIME,
    "deployedByUserId" TEXT,
    "rolledBackAt" DATETIME,
    "rollbackReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "change_proposals_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "change_proposals_deployedByUserId_fkey" FOREIGN KEY ("deployedByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "change_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "isApproved" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "change_comments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "change_proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "change_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "change_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configBefore" JSONB NOT NULL,
    "configAfter" JSONB NOT NULL,
    "filesModified" JSONB,
    "tested" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" DATETIME,
    "deployedBy" TEXT,
    "deployedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "change_versions_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "change_proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "change_versions_deployedByUserId_fkey" FOREIGN KEY ("deployedByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "data" JSONB,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "lastChangeProposalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "settings_lastChangeProposalId_fkey" FOREIGN KEY ("lastChangeProposalId") REFERENCES "change_proposals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hf_downloads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" REAL,
    "speedMBps" REAL,
    "sizeTotal" REAL,
    "sizeDownloaded" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hf_downloads_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "remote_systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "encryption_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyVersion" INTEGER NOT NULL,
    "keyType" TEXT NOT NULL DEFAULT 'MASTER',
    "source" TEXT NOT NULL DEFAULT 'ENV',
    "keyHint" TEXT,
    "importedCert" TEXT,
    "importedCertFingerprint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "providers_name_type_key" ON "providers"("name", "type");

-- CreateIndex
CREATE INDEX "provider_models_providerId_status_idx" ON "provider_models"("providerId", "status");

-- CreateIndex
CREATE INDEX "system_installations_systemId_softwareType_idx" ON "system_installations"("systemId", "softwareType");

-- CreateIndex
CREATE UNIQUE INDEX "hardware_info_systemId_key" ON "hardware_info"("systemId");

-- CreateIndex
CREATE INDEX "benchmark_runs_providerId_status_idx" ON "benchmark_runs"("providerId", "status");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_isActive_idx" ON "chat_sessions"("userId", "isActive");

-- CreateIndex
CREATE INDEX "chat_messages_sessionId_createdAt_idx" ON "chat_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_groupId_createdAt_idx" ON "chat_messages"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_members_groupId_userId_key" ON "chat_group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "routing_rules_enabled_priority_idx" ON "routing_rules"("enabled", "priority");

-- CreateIndex
CREATE INDEX "queue_tasks_status_priority_idx" ON "queue_tasks"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "system_access_systemId_userId_key" ON "system_access"("systemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_connections_providerId_agentType_key" ON "agent_connections"("providerId", "agentType");

-- CreateIndex
CREATE INDEX "agent_commands_status_userId_idx" ON "agent_commands"("status", "userId");

-- CreateIndex
CREATE INDEX "agent_tool_logs_agentId_createdAt_idx" ON "agent_tool_logs"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_tool_logs_sessionId_createdAt_idx" ON "agent_tool_logs"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "pi_calls_executionStatus_userId_idx" ON "pi_calls"("executionStatus", "userId");

-- CreateIndex
CREATE INDEX "memories_userId_category_createdAt_idx" ON "memories"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "memories_userId_isPromoted_idx" ON "memories"("userId", "isPromoted");

-- CreateIndex
CREATE UNIQUE INDEX "vector_indexes_memoryId_key" ON "vector_indexes"("memoryId");

-- CreateIndex
CREATE INDEX "vector_indexes_vectorStore_idx" ON "vector_indexes"("vectorStore");

-- CreateIndex
CREATE INDEX "pending_deletions_scheduledFor_idx" ON "pending_deletions"("scheduledFor");

-- CreateIndex
CREATE INDEX "change_proposals_status_category_idx" ON "change_proposals"("status", "category");

-- CreateIndex
CREATE INDEX "change_proposals_status_priority_idx" ON "change_proposals"("status", "priority");

-- CreateIndex
CREATE INDEX "change_comments_proposalId_createdAt_idx" ON "change_comments"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "change_versions_proposalId_version_idx" ON "change_versions"("proposalId", "version");

-- CreateIndex
CREATE INDEX "system_logs_level_createdAt_idx" ON "system_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_engine_createdAt_idx" ON "system_logs"("engine", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "hf_downloads_status_systemId_idx" ON "hf_downloads"("status", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "encryption_keys_keyVersion_key" ON "encryption_keys"("keyVersion");

-- CreateIndex
CREATE INDEX "encryption_keys_isActive_idx" ON "encryption_keys"("isActive");
