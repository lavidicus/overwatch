-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'advisor',
    "systemPrompt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "consensus_rounds" (
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
CREATE TABLE IF NOT EXISTS "consensus_messages" (
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
CREATE TABLE IF NOT EXISTS "advisor_profiles" (
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

-- chat_groups — add missing columns (if not already present)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so use CREATE TABLE IF NOT EXISTS pattern
CREATE TABLE IF NOT EXISTS "chat_groups_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "maxRounds" INTEGER NOT NULL DEFAULT 5,
    "judgeProviderId" TEXT,
    "judgeModelId" TEXT,
    "allowToolCalls" BOOLEAN NOT NULL DEFAULT 1,
    "requireToolApproval" BOOLEAN NOT NULL DEFAULT 1,
    "allowedToolIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy existing data if the old table exists
INSERT OR IGNORE INTO "chat_groups_new" ("id", "name", "description", "ownerId", "isActive", "maxRounds", "judgeProviderId", "judgeModelId", "allowToolCalls", "requireToolApproval", "allowedToolIds", "createdAt", "updatedAt")
SELECT "id", "name", "description", "ownerId", "isActive",
       COALESCE("maxRounds", 5),
       COALESCE("judgeProviderId", NULL),
       COALESCE("judgeModelId", NULL),
       COALESCE("allowToolCalls", 1),
       COALESCE("requireToolApproval", 1),
       COALESCE("allowedToolIds", NULL),
       "createdAt", "updatedAt"
FROM "chat_groups"
WHERE EXISTS (SELECT 1 FROM pragma_table_info('chat_groups') WHERE name = 'maxRounds');

DROP TABLE IF EXISTS "chat_groups";
ALTER TABLE "chat_groups_new" RENAME TO "chat_groups";

-- chat_sessions — add missing columns
CREATE TABLE IF NOT EXISTS "chat_sessions_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "agentProviderId" TEXT,
    "isAgentChat" BOOLEAN NOT NULL DEFAULT 0,
    "isGroupChat" BOOLEAN NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "allowedToolIds" TEXT,
    "systemPrompt" TEXT,
    "temperature" REAL,
    "maxTokens" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_sessions_agentProviderId_fkey" FOREIGN KEY ("agentProviderId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "provider_models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT OR IGNORE INTO "chat_sessions_new" ("id", "name", "userId", "providerId", "modelId", "agentProviderId", "isAgentChat", "isGroupChat", "groupId", "allowedToolIds", "systemPrompt", "temperature", "maxTokens", "isActive", "createdAt", "updatedAt")
SELECT "id", "name", "userId", "providerId", "modelId", "agentProviderId", "isAgentChat", "isGroupChat", "groupId", "allowedToolIds", "systemPrompt", "temperature", "maxTokens", "isActive", "createdAt", "updatedAt"
FROM "chat_sessions"
WHERE EXISTS (SELECT 1 FROM pragma_table_info('chat_sessions') WHERE name = 'isAgentChat');

DROP TABLE IF EXISTS "chat_sessions";
ALTER TABLE "chat_sessions_new" RENAME TO "chat_sessions";
CREATE INDEX IF NOT EXISTS "chat_sessions_userId_isActive_idx" ON "chat_sessions"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "chat_sessions_groupId_idx" ON "chat_sessions"("groupId");

-- provider_models — add missing columns
CREATE TABLE IF NOT EXISTS "provider_models_new" (
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

INSERT OR IGNORE INTO "provider_models_new" ("id", "providerId", "name", "displayName", "quantization", "sizeGB", "parameters", "source", "downloadPath", "systemId", "visionModelId", "status", "downloadProgress", "downloadedAt", "createdAt", "updatedAt")
SELECT "id", "providerId", "name", "displayName", "quantization", "sizeGB", "parameters", "source", "downloadPath", "systemId", "visionModelId", "status", "downloadProgress", "downloadedAt", "createdAt", "updatedAt"
FROM "provider_models"
WHERE EXISTS (SELECT 1 FROM pragma_table_info('provider_models') WHERE name = 'visionModelId');

DROP TABLE IF EXISTS "provider_models";
ALTER TABLE "provider_models_new" RENAME TO "provider_models";
CREATE INDEX IF NOT EXISTS "provider_models_providerId_status_idx" ON "provider_models"("providerId", "status");
CREATE INDEX IF NOT EXISTS "provider_models_systemId_idx" ON "provider_models"("systemId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_participants_groupId_idx" ON "agent_participants"("groupId");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_participants_groupId_agentName_key" ON "agent_participants"("groupId", "agentName");
CREATE INDEX IF NOT EXISTS "consensus_rounds_groupId_createdAt_idx" ON "consensus_rounds"("groupId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "consensus_rounds_groupId_roundNumber_key" ON "consensus_rounds"("groupId", "roundNumber");
CREATE INDEX IF NOT EXISTS "consensus_messages_roundId_position_idx" ON "consensus_messages"("roundId", "position");
