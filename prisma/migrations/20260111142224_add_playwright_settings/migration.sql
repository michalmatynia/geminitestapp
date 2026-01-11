-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "playwrightHeadless" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playwrightNavigationTimeout" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "playwrightSlowMo" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "playwrightTimeout" INTEGER NOT NULL DEFAULT 15000;
