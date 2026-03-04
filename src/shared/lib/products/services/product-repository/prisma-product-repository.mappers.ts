import {
  Prisma,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  ImageFile as PrismaImageFile,
  Catalog as PrismaCatalog,
  ProductCatalog as PrismaProductCatalog,
} from '@prisma/client';
import type { ImageFileRecord } from '@/shared/contracts/files';
import { CatalogRecord, ProductWithImages, ProductImageRecord } from '@/shared/contracts/products';
import { normalizeProductParameterValues } from './prisma-product-repository.helpers';

export const toImageFileRecord = (imageFile: PrismaImageFile): ImageFileRecord => ({
  id: imageFile.id,
  filename: imageFile.filename,
  filepath: imageFile.filepath,
  mimetype: imageFile.mimetype,
  size: imageFile.size,
  width: imageFile.width,
  height: imageFile.height,
  tags: imageFile.tags ?? [],
  createdAt: imageFile.createdAt.toISOString(),
  updatedAt: imageFile.updatedAt.toISOString(),
});

export const toCatalogRecord = (
  catalog: PrismaCatalog & { languages?: { languageId: string }[] }
): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId,
  defaultPriceGroupId: catalog.defaultPriceGroupId,
  createdAt: catalog.createdAt.toISOString(),
  updatedAt: catalog.updatedAt.toISOString(),
  languageIds: catalog.languages?.map((l) => l.languageId) ?? [],
  priceGroupIds: catalog.priceGroupIds ?? [],
});

export const toProductImageRecord = (
  image: PrismaProductImage & { imageFile?: PrismaImageFile | null }
): ProductImageRecord | null => {
  if (!image.imageFile) return null;

  return {
    productId: image.productId,
    imageFileId: image.imageFileId,
    assignedAt: image.assignedAt.toISOString(),
    imageFile: toImageFileRecord(image.imageFile),
  };
};

export type FullPrismaProduct = PrismaProduct & {
  images?: (PrismaProductImage & { imageFile: PrismaImageFile | null })[];
  catalogs?: (PrismaProductCatalog & {
    catalog: PrismaCatalog & { languages?: { languageId: string }[] };
  })[];
  categories?: { categoryId: string } | { categoryId: string }[] | null;
  tags?: Prisma.ProductTagAssignmentGetPayload<{}>[];
  producers?: Prisma.ProductProducerAssignmentGetPayload<{}>[];
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const resolveCategoryId = (product: FullPrismaProduct): string | null => {
  const direct = toTrimmedString(
    (product as FullPrismaProduct & { categoryId?: unknown }).categoryId
  );
  if (direct) return direct;

  const relation = (product as FullPrismaProduct & { categories?: unknown }).categories;
  if (Array.isArray(relation)) {
    for (const entry of relation) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const categoryId = toTrimmedString(record['categoryId']);
      if (categoryId) return categoryId;
    }
    return null;
  }

  if (relation && typeof relation === 'object') {
    const record = relation as Record<string, unknown>;
    const categoryId = toTrimmedString(record['categoryId']);
    return categoryId || null;
  }

  return null;
};

export const toProductRecord = (product: FullPrismaProduct): ProductWithImages => {
  const catalogs =
    product.catalogs?.map((pc) => ({
      productId: pc.productId,
      catalogId: pc.catalogId,
      assignedAt: pc.assignedAt.toISOString(),
      catalog: toCatalogRecord(pc.catalog),
    })) ?? [];

  return {
    id: product.id,
    sku: product.sku ?? null,
    baseProductId: product.baseProductId ?? null,
    defaultPriceGroupId: product.defaultPriceGroupId ?? null,
    ean: product.ean ?? null,
    gtin: product.gtin ?? null,
    asin: product.asin ?? null,
    name: {
      en: product.name_en ?? '',
      pl: product.name_pl ?? null,
      de: product.name_de ?? null,
    },
    description: {
      en: product.description_en ?? '',
      pl: product.description_pl ?? null,
      de: product.description_de ?? null,
    },
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
    published: (product.published as boolean | null | undefined) ?? true,
    catalogId: (product.catalogId as string | null | undefined) ?? catalogs[0]?.catalogId ?? '',
    parameters: normalizeProductParameterValues(product.parameters),
    imageLinks: product.imageLinks ?? [],
    imageBase64s: [],
    noteIds: product.noteIds ?? [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    categoryId: resolveCategoryId(product) ?? null,
    tags:
      product.tags?.map((t) => ({
        productId: t.productId,
        tagId: t.tagId,
        assignedAt: t.assignedAt.toISOString(),
      })) ?? [],
    producers:
      product.producers?.map((p) => ({
        productId: p.productId,
        producerId: p.producerId,
        assignedAt: p.assignedAt.toISOString(),
      })) ?? [],
    images:
      product.images
        ?.map(toProductImageRecord)
        .filter((i): i is ProductImageRecord => i !== null) ?? [],
    catalogs,
  };
};
