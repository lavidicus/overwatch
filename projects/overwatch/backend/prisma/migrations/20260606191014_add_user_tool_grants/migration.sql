-- CreateTable
CREATE TABLE "user_tool_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "sessionId" TEXT,
    "argsMatch" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "user_tool_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_tool_grants_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_tool_grants_userId_revokedAt_idx" ON "user_tool_grants"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_tool_grants_userId_toolId_scope_sessionId_key" ON "user_tool_grants"("userId", "toolId", "scope", "sessionId");
