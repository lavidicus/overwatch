-- AlterTable: add allowedToolIds JSON column to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN "allowedToolIds" JSONB;

-- CreateTable: tools
CREATE TABLE "tools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "schema" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "tools_name_key" ON "tools"("name");
CREATE INDEX "tools_enabled_category_idx" ON "tools"("enabled", "category");

-- CreateTable: tool_invocations
CREATE TABLE "tool_invocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "tool_invocations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tool_invocations_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "tool_invocations_status_createdAt_idx" ON "tool_invocations"("status", "createdAt");
CREATE INDEX "tool_invocations_sessionId_createdAt_idx" ON "tool_invocations"("sessionId", "createdAt");
