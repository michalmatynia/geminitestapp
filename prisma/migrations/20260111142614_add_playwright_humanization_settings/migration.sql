-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "playwrightClickDelayMax" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "playwrightClickDelayMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "playwrightHumanizeMouse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playwrightMouseJitter" INTEGER NOT NULL DEFAULT 6;
