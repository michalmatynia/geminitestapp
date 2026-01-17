import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import type { WithId } from "mongodb";
import type { CatalogRecord, ImageFileRecord } from "@/types";

export type MigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type MigrationBatchResult = {
  direction: MigrationDirection;
  productsProcessed: number;
  productsUpserted: number;
  nextCursor: string | null;
  missingImageFileIds: string[];
  missingCatalogIds: string[];
};

type ImageFileInput = {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type CatalogInput = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  priceGroupIds?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  languageIds?: string[] | null;
  languages?: { languageId: string }[];
};

type CatalogDocument = Omit<CatalogRecord, "languageIds"> & {
  languageIds?: string[] | null;
};

type ProductDocument = {
  _id: string;
  id: string;
  sku: string | null;
  baseProductId?: string | null;
  defaultPriceGroupId?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  description_de: string | null;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    productId: string;
    imageFileId: string;
    assignedAt: Date;
    imageFile: ImageFileRecord;
  }>;
  catalogs: Array<{
    productId: string;
    catalogId: string;
    assignedAt: Date;
    catalog: CatalogDocument;
  }>;
};

const PRODUCT_COLLECTION = "products";

type ProductInput = {
  id: string;
  sku: string | null;
  baseProductId?: string | null;
  defaultPriceGroupId?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  description_de: string | null;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    productId: string;
    imageFileId: string;
    assignedAt: Date;
    imageFile: ImageFileInput;
  }>;
  catalogs: Array<{
    productId: string;
    catalogId: string;
    assignedAt: Date;
    catalog: CatalogInput;
  }>;
};

const toImageFileRecord = (imageFile: ImageFileInput): ImageFileRecord => ({
  id: imageFile.id,
  filename: imageFile.filename,
  filepath: imageFile.filepath,
  mimetype: imageFile.mimetype,
  size: imageFile.size,
  width: imageFile.width ?? null,
  height: imageFile.height ?? null,
  createdAt: imageFile.createdAt,
  updatedAt: imageFile.updatedAt,
});

const toCatalogDocument = (catalog: CatalogInput): CatalogDocument => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description ?? null,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId ?? null,
  defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
  createdAt: catalog.createdAt,
  updatedAt: catalog.updatedAt,
  languageIds: Array.isArray(catalog.languageIds)
    ? catalog.languageIds
    : catalog.languages?.map((entry) => entry.languageId) ?? [],
  priceGroupIds: Array.isArray(catalog.priceGroupIds)
    ? catalog.priceGroupIds
    : [],
});

const buildProductDocument = (product: ProductInput): ProductDocument => ({
  _id: product.id,
  id: product.id,
  sku: product.sku ?? null,
  baseProductId: product.baseProductId ?? null,
  defaultPriceGroupId: product.defaultPriceGroupId ?? null,
  ean: product.ean ?? null,
  gtin: product.gtin ?? null,
  asin: product.asin ?? null,
  name_en: product.name_en ?? null,
  name_pl: product.name_pl ?? null,
  name_de: product.name_de ?? null,
  description_en: product.description_en ?? null,
  description_pl: product.description_pl ?? null,
  description_de: product.description_de ?? null,
  supplierName: product.supplierName ?? null,
  supplierLink: product.supplierLink ?? null,
  priceComment: product.priceComment ?? null,
  stock: product.stock ?? null,
  price: product.price ?? null,
  sizeLength: product.sizeLength ?? null,
  sizeWidth: product.sizeWidth ?? null,
  weight: product.weight ?? null,
  length: product.length ?? null,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
  images: product.images.map((image) => ({
    productId: image.productId,
    imageFileId: image.imageFileId,
    assignedAt: image.assignedAt,
    imageFile: toImageFileRecord(image.imageFile),
  })),
  catalogs: product.catalogs.map((entry) => ({
    productId: entry.productId,
    catalogId: entry.catalogId,
    assignedAt: entry.assignedAt,
    catalog: toCatalogDocument(entry.catalog),
  })),
});

export async function getProductMigrationTotal(direction: MigrationDirection) {
  if (direction === "prisma-to-mongo") {
    return prisma.product.count();
  }
  const mongo = await getMongoDb();
  return mongo.collection<ProductDocument>(PRODUCT_COLLECTION).countDocuments();
}

export async function migrateProductBatch({
  direction,
  dryRun = false,
  cursor,
  batchSize = 50,
}: {
  direction: MigrationDirection;
  dryRun?: boolean;
  cursor?: string | null;
  batchSize?: number;
}): Promise<MigrationBatchResult> {
  if (direction === "prisma-to-mongo") {
    const mongo = await getMongoDb();
    const products = await prisma.product.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: { id: "asc" },
      take: batchSize,
      include: {
        images: { include: { imageFile: true } },
        catalogs: {
          include: {
            catalog: { include: { languages: { select: { languageId: true } } } },
          },
        },
      },
    });
    const docs = products.map(buildProductDocument);
    if (!dryRun) {
      await mongo.collection<ProductDocument>(PRODUCT_COLLECTION).bulkWrite(
        docs.map((doc) => ({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }
    const nextCursor =
      products.length === batchSize
        ? products[products.length - 1]?.id ?? null
        : null;
    return {
      direction,
      productsProcessed: docs.length,
      productsUpserted: dryRun ? 0 : docs.length,
      nextCursor,
      missingImageFileIds: [],
      missingCatalogIds: [],
    };
  }

  const mongo = await getMongoDb();
  const mongoDocs: WithId<ProductDocument>[] = await mongo
    .collection<ProductDocument>(PRODUCT_COLLECTION)
    .find(cursor ? { _id: { $gt: cursor } } : {})
    .sort({ _id: 1 })
    .limit(batchSize)
    .toArray();
  const imageFileMap = new Map<string, ImageFileRecord>();
  const catalogMap = new Map<string, CatalogDocument>();
  for (const doc of mongoDocs) {
    const images = Array.isArray(doc.images) ? doc.images : [];
    for (const image of images) {
      imageFileMap.set(image.imageFileId, image.imageFile);
    }
    const catalogs = Array.isArray(doc.catalogs) ? doc.catalogs : [];
    for (const catalog of catalogs) {
      catalogMap.set(catalog.catalogId, catalog.catalog);
    }
  }

  if (!dryRun) {
    for (const [id, imageFile] of Array.from(imageFileMap.entries())) {
      await prisma.imageFile.upsert({
        where: { id },
        update: {
          filename: imageFile.filename,
          filepath: imageFile.filepath,
          mimetype: imageFile.mimetype,
          size: imageFile.size,
          width: imageFile.width ?? null,
          height: imageFile.height ?? null,
        },
        create: {
          id,
          filename: imageFile.filename,
          filepath: imageFile.filepath,
          mimetype: imageFile.mimetype,
          size: imageFile.size,
          width: imageFile.width ?? null,
          height: imageFile.height ?? null,
        },
      });
    }
    for (const [id, catalog] of Array.from(catalogMap.entries())) {
      await prisma.catalog.upsert({
        where: { id },
        update: {
          name: catalog.name,
          description: catalog.description ?? null,
          isDefault: catalog.isDefault ?? false,
          defaultLanguageId: catalog.defaultLanguageId ?? null,
        },
        create: {
          id,
          name: catalog.name,
          description: catalog.description ?? null,
          isDefault: catalog.isDefault ?? false,
          defaultLanguageId: catalog.defaultLanguageId ?? null,
        },
      });
      const languageIds: string[] = [];
      const rawLanguageIds = catalog.languageIds ?? [];
      if (Array.isArray(rawLanguageIds)) {
        for (const languageId of rawLanguageIds) {
          if (typeof languageId === "string") {
            languageIds.push(languageId);
          }
        }
      }
      if (languageIds.length > 0) {
        const existingLanguages = await prisma.language.findMany({
          where: { id: { in: languageIds } },
          select: { id: true },
        });
        const validLanguageIds = new Set(
          existingLanguages.map((entry) => entry.id)
        );
        await prisma.catalogLanguage.deleteMany({ where: { catalogId: id } });
        const filteredLanguageIds: string[] = [];
        for (const languageId of languageIds) {
          if (validLanguageIds.has(languageId)) {
            filteredLanguageIds.push(languageId);
          }
        }
        if (filteredLanguageIds.length > 0) {
          await prisma.catalogLanguage.createMany({
            data: filteredLanguageIds.map((languageId) => ({
              catalogId: id,
              languageId,
            })),
            skipDuplicates: true,
          });
        }
        const nextDefaultLanguageId =
          catalog.defaultLanguageId &&
          filteredLanguageIds.includes(catalog.defaultLanguageId)
            ? catalog.defaultLanguageId
            : filteredLanguageIds[0] ?? null;
        await prisma.catalog.update({
          where: { id },
          data: { defaultLanguageId: nextDefaultLanguageId },
        });
      } else {
        await prisma.catalog.update({
          where: { id },
          data: { defaultLanguageId: null },
        });
      }
    }
  }

  const imageFileIds = new Set(imageFileMap.keys());
  const catalogIds = new Set(catalogMap.keys());
  const existingImages = await prisma.imageFile.findMany({
    where: { id: { in: Array.from(imageFileIds) } },
    select: { id: true },
  });
  const existingCatalogs = await prisma.catalog.findMany({
    where: { id: { in: Array.from(catalogIds) } },
    select: { id: true },
  });
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  const existingCatalogIds = new Set(existingCatalogs.map((cat) => cat.id));
  const missingImageFileIds = Array.from(imageFileIds).filter(
    (id) => !existingImageIds.has(id)
  );
  const missingCatalogIds = Array.from(catalogIds).filter(
    (id) => !existingCatalogIds.has(id)
  );

  if (!dryRun) {
    for (const doc of mongoDocs) {
      await prisma.product.upsert({
        where: { id: doc.id ?? doc._id },
        update: {
          sku: doc.sku ?? undefined,
          baseProductId: doc.baseProductId ?? undefined,
          defaultPriceGroupId: doc.defaultPriceGroupId ?? undefined,
          ean: doc.ean ?? undefined,
          gtin: doc.gtin ?? undefined,
          asin: doc.asin ?? undefined,
          name_en: doc.name_en ?? undefined,
          name_pl: doc.name_pl ?? undefined,
          name_de: doc.name_de ?? undefined,
          description_en: doc.description_en ?? undefined,
          description_pl: doc.description_pl ?? undefined,
          description_de: doc.description_de ?? undefined,
          supplierName: doc.supplierName ?? undefined,
          supplierLink: doc.supplierLink ?? undefined,
          priceComment: doc.priceComment ?? undefined,
          stock: doc.stock ?? undefined,
          price: doc.price ?? undefined,
          sizeLength: doc.sizeLength ?? undefined,
          sizeWidth: doc.sizeWidth ?? undefined,
          weight: doc.weight ?? undefined,
          length: doc.length ?? undefined,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        },
        create: {
          id: doc.id ?? doc._id,
          sku: doc.sku ?? undefined,
          baseProductId: doc.baseProductId ?? undefined,
          defaultPriceGroupId: doc.defaultPriceGroupId ?? undefined,
          ean: doc.ean ?? undefined,
          gtin: doc.gtin ?? undefined,
          asin: doc.asin ?? undefined,
          name_en: doc.name_en ?? undefined,
          name_pl: doc.name_pl ?? undefined,
          name_de: doc.name_de ?? undefined,
          description_en: doc.description_en ?? undefined,
          description_pl: doc.description_pl ?? undefined,
          description_de: doc.description_de ?? undefined,
          supplierName: doc.supplierName ?? undefined,
          supplierLink: doc.supplierLink ?? undefined,
          priceComment: doc.priceComment ?? undefined,
          stock: doc.stock ?? undefined,
          price: doc.price ?? undefined,
          sizeLength: doc.sizeLength ?? undefined,
          sizeWidth: doc.sizeWidth ?? undefined,
          weight: doc.weight ?? undefined,
          length: doc.length ?? undefined,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        },
      });

      const validImageIds: string[] = [];
      const images = Array.isArray(doc.images) ? doc.images : [];
      for (const image of images) {
        if (existingImageIds.has(image.imageFileId)) {
          validImageIds.push(image.imageFileId);
        }
      }
      const validCatalogIds: string[] = [];
      const catalogs = Array.isArray(doc.catalogs) ? doc.catalogs : [];
      for (const catalog of catalogs) {
        if (existingCatalogIds.has(catalog.catalogId)) {
          validCatalogIds.push(catalog.catalogId);
        }
      }

      await prisma.productImage.deleteMany({ where: { productId: doc.id } });
      if (validImageIds.length > 0) {
        await prisma.productImage.createMany({
          data: validImageIds.map((imageFileId) => ({
            productId: doc.id,
            imageFileId,
          })),
          skipDuplicates: true,
        });
      }

      await prisma.productCatalog.deleteMany({ where: { productId: doc.id } });
      if (validCatalogIds.length > 0) {
        await prisma.productCatalog.createMany({
          data: validCatalogIds.map((catalogId) => ({
            productId: doc.id,
            catalogId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  const nextCursor =
    mongoDocs.length === batchSize
      ? mongoDocs[mongoDocs.length - 1]?._id ?? null
      : null;
  return {
    direction,
    productsProcessed: mongoDocs.length,
    productsUpserted: dryRun ? 0 : mongoDocs.length,
    nextCursor,
    missingImageFileIds,
    missingCatalogIds,
  };
}
