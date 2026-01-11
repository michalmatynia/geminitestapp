/*
  Warnings:

  - Changed the type of `code` on the `Country` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('PL', 'DE', 'GB', 'US');

-- AlterTable
ALTER TABLE "Country" DROP COLUMN "code",
ADD COLUMN     "code" "CountryCode" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");
