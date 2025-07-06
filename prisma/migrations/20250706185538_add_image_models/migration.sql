-- Drop the imageUrl column from the Product table
ALTER TABLE "Product" DROP COLUMN "imageUrl";

-- Create the ImageFile table
CREATE TABLE "ImageFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create the ProductImage join table
CREATE TABLE "ProductImage" (
    "productId" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("imageFileId") REFERENCES "ImageFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY ("productId", "imageFileId")
);