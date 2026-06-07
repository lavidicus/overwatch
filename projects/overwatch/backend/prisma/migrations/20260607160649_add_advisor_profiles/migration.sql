-- CreateTable
CREATE TABLE "agent_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'advisor',
    "systemPrompt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consensus_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "sessionId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "finalConsensus" TEXT,
    "judgeAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "consensus_rounds_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consensus_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consensus_messages_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "consensus_rounds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "advisor_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "providerId" TEXT,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "advisor_profiles_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_chat_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRounds" INTEGER NOT NULL DEFAULT 5,
    "judgeProviderId" TEXT,
    "judgeModelId" TEXT,
    "allowToolCalls" BOOLEAN NOT NULL DEFAULT true,
    "requireToolApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowedToolIds" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_chat_groups" ("allowToolCalls", "allowedToolIds", "createdAt", "description", "id", "isActive", "name", "ownerId", "requireToolApproval", "updatedAt") SELECT "allowToolCalls", "allowedToolIds", "createdAt", "description", "id", "isActive", "name", "ownerId", "requireToolApproval", "updatedAt" FROM "chat_groups";
DROP TABLE "chat_groups";
ALTER TABLE "new_chat_groups" RENAME TO "chat_groups";
CREATE TABLE "new_chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "agentProviderId" TEXT,
    "isAgentChat" BOOLEAN NOT NULL DEFAULT false,
    "isGroupChat" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "allowedToolIds" JSONB,
    "systemPrompt" TEXT,
    "temperature" REAL,
    "maxTokens" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_sessions_agentProviderId_fkey" FOREIGN KEY ("agentProviderId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "provider_models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_chat_sessions" ("agentProviderId", "allowedToolIds", "createdAt", "id", "isActive", "isAgentChat", "maxTokens", "modelId", "name", "providerId", "systemPrompt", "temperature", "updatedAt", "userId") SELECT "agentProviderId", "allowedToolIds", "createdAt", "id", "isActive", "isAgentChat", "maxTokens", "modelId", "name", "providerId", "systemPrompt", "temperature", "updatedAt", "userId" FROM "chat_sessions";
DROP TABLE "chat_sessions";
ALTER TABLE "new_chat_sessions" RENAME TO "chat_sessions";
CREATE INDEX "chat_sessions_userId_isActive_idx" ON "chat_sessions"("userId", "isActive");
CREATE INDEX "chat_sessions_groupId_idx" ON "chat_sessions"("groupId");
CREATE TABLE "new_provider_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "quantization" TEXT,
    "sizeGB" REAL,
    "parameters" TEXT,
    "source" TEXT,
    "downloadPath" TEXT,
    "systemId" TEXT,
    "visionModelId" TEXT,
    "status" TEXT NOT NULL,
    "downloadProgress" REAL,
    "downloadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "provider_models_visionModelId_fkey" FOREIGN KEY ("visionModelId") REFERENCES "provider_models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "provider_models_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "remote_systems" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "provider_models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_provider_models" ("createdAt", "displayName", "downloadPath", "downloadProgress", "downloadedAt", "id", "name", "parameters", "providerId", "quantization", "sizeGB", "source", "status", "systemId", "updatedAt", "visionModelId") SELECT "createdAt", "displayName", "downloadPath", "downloadProgress", "downloadedAt", "id", "name", "parameters", "providerId", "quantization", "sizeGB", "source", "status", "systemId", "updatedAt", "visionModelId" FROM "provider_models";
DROP TABLE "provider_models";
ALTER TABLE "new_provider_models" RENAME TO "provider_models";
CREATE INDEX "provider_models_providerId_status_idx" ON "provider_models"("providerId", "status");
CREATE INDEX "provider_models_systemId_idx" ON "provider_models"("systemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "agent_participants_groupId_idx" ON "agent_participants"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_participants_groupId_agentName_key" ON "agent_participants"("groupId", "agentName");

-- CreateIndex
CREATE INDEX "consensus_rounds_groupId_createdAt_idx" ON "consensus_rounds"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "consensus_rounds_groupId_roundNumber_key" ON "consensus_rounds"("groupId", "roundNumber");

-- CreateIndex
CREATE INDEX "consensus_messages_roundId_position_idx" ON "consensus_messages"("roundId", "position");
