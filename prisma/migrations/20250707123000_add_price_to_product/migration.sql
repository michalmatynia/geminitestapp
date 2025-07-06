-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT,
    "name" TEXT,
    "supplierName" TEXT,
    "supplierLink" TEXT,
    "priceComment" TEXT,
    "stock" INTEGER,
    "purchasePriceWithoutShipping" REAL,
    "purchasePriceWithShipping" REAL,
    "purchaseDate" DATETIME,
    "salePrice" REAL,
    "price" INTEGER,
    "sizeLength" INTEGER,
    "sizeWidth" INTEGER,
    "cartonComment" TEXT,
    "cartonSize" TEXT,
    "moq" INTEGER,
    "weight" REAL,
    "material" TEXT,
    "seaShipping" TEXT,
    "trainShipping" TEXT,
    "airShipping" TEXT,
    "ddpShipping" TEXT,
    "sparksOfSindri" TEXT,
    "starGater" TEXT,
    "olx" TEXT,
    "nameEN" TEXT,
    "namePL" TEXT,
    "descriptionPL" TEXT,
    "descriptionEN" TEXT,
    "gptPrompt" TEXT,
    "vinted" TEXT,
    "de" TEXT,
    "asin" TEXT,
    "alternativeName" TEXT,
    "alternativeDescriptionPL" TEXT,
    "alternativeDescriptionEN" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImageFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "productId" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("productId", "imageFileId"),
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductImage_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "ImageFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

