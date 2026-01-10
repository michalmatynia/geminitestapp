/*
  Warnings:

  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT,
    "name_en" TEXT,
    "name_pl" TEXT,
    "name_de" TEXT,
    "description_en" TEXT,
    "description_pl" TEXT,
    "description_de" TEXT,
    "supplierName" TEXT,
    "supplierLink" TEXT,
    "priceComment" TEXT,
    "stock" INTEGER,
    "price" INTEGER,
    "sizeLength" INTEGER,
    "sizeWidth" INTEGER,
    "weight" INTEGER,
    "length" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("createdAt", "id", "price", "priceComment", "sizeLength", "sizeWidth", "sku", "stock", "supplierLink", "supplierName", "updatedAt") SELECT "createdAt", "id", "price", "priceComment", "sizeLength", "sizeWidth", "sku", "stock", "supplierLink", "supplierName", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
