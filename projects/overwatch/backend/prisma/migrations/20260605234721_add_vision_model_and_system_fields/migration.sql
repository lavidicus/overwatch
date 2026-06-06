-- AlterTable
ALTER TABLE "provider_models" ADD COLUMN "systemId" TEXT;
ALTER TABLE "provider_models" ADD COLUMN "visionModelId" TEXT;

-- CreateIndex
CREATE INDEX "provider_models_systemId_idx" ON "provider_models"("systemId");
