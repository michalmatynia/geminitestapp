-- AlterTable
ALTER TABLE "ImageFile" ADD COLUMN "height" INTEGER;
ALTER TABLE "ImageFile" ADD COLUMN "width" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductImage" (
    "productId" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("productId", "imageFileId"),
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductImage_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "ImageFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductImage" ("assignedAt", "imageFileId", "productId") SELECT "assignedAt", "imageFileId", "productId" FROM "ProductImage";
DROP TABLE "ProductImage";
ALTER TABLE "new_ProductImage" RENAME TO "ProductImage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
