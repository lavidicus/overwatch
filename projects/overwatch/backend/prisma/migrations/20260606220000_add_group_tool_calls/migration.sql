-- AlterTable: add tool-calling config to ChatGroup
ALTER TABLE "chat_groups" ADD COLUMN "allowToolCalls" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "chat_groups" ADD COLUMN "requireToolApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "chat_groups" ADD COLUMN "allowedToolIds" JSONB;
