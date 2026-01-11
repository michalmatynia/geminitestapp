/*
  Warnings:

  - A unique constraint covering the columns `[integrationId]` on the table `IntegrationConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "playwrightStorageState" TEXT,
ADD COLUMN     "playwrightStorageStateUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_integrationId_key" ON "IntegrationConnection"("integrationId");
