-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "playwrightActionDelayMax" INTEGER NOT NULL DEFAULT 900,
ADD COLUMN     "playwrightActionDelayMin" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "playwrightDeviceName" TEXT,
ADD COLUMN     "playwrightEmulateDevice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playwrightInputDelayMax" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "playwrightInputDelayMin" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "playwrightProxyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playwrightProxyPassword" TEXT,
ADD COLUMN     "playwrightProxyServer" TEXT,
ADD COLUMN     "playwrightProxyUsername" TEXT,
ALTER COLUMN "playwrightHeadless" SET DEFAULT true;
