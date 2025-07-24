-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Slug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Slug" ("createdAt", "id", "slug", "updatedAt") SELECT "createdAt", "id", "slug", "updatedAt" FROM "Slug";
DROP TABLE "Slug";
ALTER TABLE "new_Slug" RENAME TO "Slug";
CREATE UNIQUE INDEX "Slug_slug_key" ON "Slug"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
