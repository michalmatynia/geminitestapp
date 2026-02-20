import 'server-only';

import { Prisma, Product as PrismaProduct, ProductImage as PrismaProductImage, ImageFile as PrismaImageFile, Catalog as PrismaCatalog, ProductCatalog as PrismaProductCatalog } from '@prisma/client';

import type { CatalogRecord, ProductWithImages } from '@/shared/contracts/products';
import type { ProductParameterValue } from '@/shared/contracts/products';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from '@/shared/contracts/products';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import { conflictError, internalError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';
import type { ImageFileRecord } from '@/shared/contracts/files';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key: string) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

const normalizeImageFileIds = (imageFileIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const rawId of imageFileIds) {
    const trimmed = rawId.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

const normalizeProductParameterValues = (
  input: unknown
): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const byParameterId = new Map<string, ProductParameterValue>();
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const parameterId = decodeSimpleParameterStorageId(
      typeof record['parameterId'] === 'string' ? record['parameterId'] : ''
    );
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'] : '';
    const valuesByLanguageRaw = record['valuesByLanguage'];
    const valuesByLanguage =
      valuesByLanguageRaw &&
      typeof valuesByLanguageRaw === 'object' &&
      !Array.isArray(valuesByLanguageRaw)
        ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
          (acc: Record<string, string>, [languageCode, languageValue]) => {
            const normalizedCode = languageCode.trim().toLowerCase();
            if (!normalizedCode || typeof languageValue !== 'string') return acc;
            acc[normalizedCode] = languageValue;
            return acc;
          },
          {}
        )
        : {};
    const current = byParameterId.get(parameterId);
    if (!current) {
      byParameterId.set(parameterId, {
        parameterId,
        value,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      });
      return;
    }
    const mergedValuesByLanguage = {
      ...(current.valuesByLanguage ?? {}),
      ...valuesByLanguage,
    };
    byParameterId.set(parameterId, {
      parameterId,
      value: current.value || value,
      ...(Object.keys(mergedValuesByLanguage).length > 0
        ? { valuesByLanguage: mergedValuesByLanguage }
        : {}),
    });
  });
  return Array.from(byParameterId.values());
};

const BASE_INTEGRATION_SLUGS = ['baselinker', 'base-com', 'base'] as const;

const buildProductWhere = (filters: ProductFilters): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = {};
  const andConditions: Prisma.ProductWhereInput[] = [];

  if (filters.sku) {
    where.sku = {
      contains: filters.sku,
      mode: 'insensitive',
    };
  }

  if (filters.search) {
    if (filters.searchLanguage) {
      andConditions.push({
        OR: [{ [filters.searchLanguage]: { contains: filters.search, mode: 'insensitive' } }],
      });
    } else {
      andConditions.push({
        OR: [
          { name_en: { contains: filters.search, mode: 'insensitive' } },
          { name_pl: { contains: filters.search, mode: 'insensitive' } },
          { name_de: { contains: filters.search, mode: 'insensitive' } },
          { description_en: { contains: filters.search, mode: 'insensitive' } },
          { description_pl: { contains: filters.search, mode: 'insensitive' } },
          { description_de: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }
  }

  if (filters.description) {
    andConditions.push({
      OR: [
        { description_en: { contains: filters.description, mode: 'insensitive' } },
        { description_pl: { contains: filters.description, mode: 'insensitive' } },
        { description_de: { contains: filters.description, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.minPrice !== undefined) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      gte: filters.minPrice,
    };
  }
  if (filters.maxPrice !== undefined) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      lte: filters.maxPrice,
    };
  }
  if (filters.startDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      gte: new Date(filters.startDate),
    };
  }
  if (filters.endDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      lte: new Date(filters.endDate),
    };
  }

  if (filters.catalogId) {
    if (filters.catalogId === 'unassigned') {
      where.catalogs = { none: {} };
    } else {
      where.catalogs = { some: { catalogId: filters.catalogId } };
    }
  }

  if (filters.categoryId) {
    andConditions.push({
      categories: {
        is: { categoryId: filters.categoryId },
      },
    });
  }

  if (filters.baseExported === true) {
    where.listings = {
      some: {
        integration: {
          slug: { in: [...BASE_INTEGRATION_SLUGS] },
        },
        externalListingId: { not: null },
      },
    };
  } else if (filters.baseExported === false) {
    where.listings = {
      none: {
        integration: {
          slug: { in: [...BASE_INTEGRATION_SLUGS] },
        },
        externalListingId: { not: null },
      },
    };
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const toImageFileRecord = (imageFile: PrismaImageFile): ImageFileRecord => ({
  id: imageFile.id,
  filename: imageFile.filename,
  filepath: imageFile.filepath,
  mimetype: imageFile.mimetype,
  size: imageFile.size,
  width: imageFile.width,
  height: imageFile.height,
  tags: (imageFile.tags) ?? [],
  createdAt: imageFile.createdAt.toISOString(),
  updatedAt: imageFile.updatedAt.toISOString(),
});

const toCatalogRecord = (catalog: PrismaCatalog & { languages?: { languageId: string }[] }): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId,
  defaultPriceGroupId: catalog.defaultPriceGroupId,
  createdAt: catalog.createdAt.toISOString(),
  updatedAt: catalog.updatedAt.toISOString(),
  languageIds: catalog.languages?.map(l => l.languageId) ?? [],
  priceGroupIds: catalog.priceGroupIds ?? [],
});

const toProductImageRecord = (image: PrismaProductImage & { imageFile?: PrismaImageFile | null }) => {
  if (!image.imageFile) return null;
  return {
    productId: image.productId,
    imageFileId: image.imageFileId,
    assignedAt: image.assignedAt.toISOString(),
    imageFile: toImageFileRecord(image.imageFile),
  };
};

type FullPrismaProduct = PrismaProduct & {
  images?: (PrismaProductImage & { imageFile: PrismaImageFile | null })[];
  catalogs?: (PrismaProductCatalog & { catalog: PrismaCatalog & { languages?: { languageId: string }[] } })[];
  categories?: { categoryId: string } | { categoryId: string }[] | null;
  tags?: (Prisma.ProductTagAssignmentGetPayload<{}>)[];
  producers?: (Prisma.ProductProducerAssignmentGetPayload<{}>)[];
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const resolveCategoryId = (product: FullPrismaProduct): string | null => {
  const direct = toTrimmedString((product as FullPrismaProduct & { categoryId?: unknown }).categoryId);
  if (direct) return direct;

  const relation = (product as FullPrismaProduct & { categories?: unknown }).categories;
  if (Array.isArray(relation)) {
    for (const entry of relation) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const categoryId =
        toTrimmedString(record['categoryId']) ||
        toTrimmedString(record['category_id']) ||
        toTrimmedString(record['id']) ||
        toTrimmedString(record['value']);
      if (categoryId) return categoryId;
    }
    return null;
  }

  if (relation && typeof relation === 'object') {
    const record = relation as Record<string, unknown>;
    const categoryId =
      toTrimmedString(record['categoryId']) ||
      toTrimmedString(record['category_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    return categoryId || null;
  }

  return null;
};

const toProductRecord = (product: FullPrismaProduct): ProductWithImages => {
  const catalogs = product.catalogs?.map(pc => ({
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
      de: product.name_de ?? null 
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
    tags: product.tags?.map(t => ({ 
      productId: t.productId,
      tagId: t.tagId,
      assignedAt: t.assignedAt.toISOString(),
    })) ?? [],
    producers: product.producers?.map(p => ({ 
      productId: p.productId,
      producerId: p.producerId,
      assignedAt: p.assignedAt.toISOString(),
    })) ?? [],
    images: product.images?.map(toProductImageRecord).filter((i): i is NonNullable<typeof i> => i !== null) ?? [],
    catalogs,
  };
};

// ---------------------------------------------------------------------------
// Repository Implementation
// ---------------------------------------------------------------------------

const createTransactionalRepository = (tx: Prisma.TransactionClient): ProductRepository => ({
  getProducts: async (filters) => {
    const where = buildProductWhere(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const products = await tx.product.findMany({
      where,
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'desc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } }
            }
          }
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return products.map(p => toProductRecord(p as FullPrismaProduct));
  },

  countProducts: (filters) => tx.product.count({ where: buildProductWhere(filters) }),

  async getProductsWithCount(filters) {
    const where = buildProductWhere(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [rawProducts, total] = await Promise.all([
      tx.product.findMany({
        where,
        include: {
          images: { include: { imageFile: true }, orderBy: { assignedAt: 'desc' } },
          catalogs: {
            include: {
              catalog: { include: { languages: { select: { languageId: true } } } },
            },
          },
          categories: { select: { categoryId: true } },
          tags: { select: { tagId: true } },
          producers: { select: { producerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.product.count({ where }),
    ]);
    return { products: rawProducts.map(p => toProductRecord(p as FullPrismaProduct)), total };
  },

  getProductById: async (id) => {
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'desc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } }
            }
          }
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  getProductBySku: async (sku) => {
    const product = await tx.product.findUnique({ 
      where: { sku },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  findProductByBaseId: async (baseProductId) => {
    const product = await tx.product.findFirst({
      where: { baseProductId },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  createProduct: async (data) => {
    if (data.sku) {
      const existing = await tx.product.findUnique({
        where: { sku: data.sku },
        select: { id: true },
      });
      if (existing) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku,
          productId: existing.id,
        });
      }
    }

    const { categoryId: _cat, id, ...rest } = data;
    const normalizedParameters =
      rest.parameters !== undefined
        ? normalizeProductParameterValues(rest.parameters)
        : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters:
              normalizedParameters as unknown as Prisma.InputJsonValue,
        }
        : {}),
      ...(id ? { id } : {}),
    }) as Prisma.ProductCreateInput;

    try {
      const product = await tx.product.create({ data: cleanData });
      return toProductRecord(product as FullPrismaProduct);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.['target']) &&
        (error.meta?.['target'] as string[]).includes('sku')
      ) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku ?? null,
        });
      }
      throw error;
    }
  },

  updateProduct: async (id, data) => {
    const productExists = await tx.product.findUnique({ where: { id } });
    if (!productExists) return null;

    const { categoryId: _cat, id: _id, ...rest } = data;
    const normalizedParameters =
      rest.parameters !== undefined
        ? normalizeProductParameterValues(rest.parameters)
        : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters:
              normalizedParameters as unknown as Prisma.InputJsonValue,
        }
        : {}),
    }) as Prisma.ProductUpdateInput;

    const product = await tx.product.update({ 
      where: { id }, 
      data: cleanData,
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return toProductRecord(product as FullPrismaProduct);
  },

  deleteProduct: async (id) => {
    const productExists = await tx.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await tx.product.delete({ 
      where: { id },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return toProductRecord(product as FullPrismaProduct);
  },

  duplicateProduct: async (id, sku) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) return null;

    const existingSku = await tx.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existingSku) {
      throw conflictError('A product with this SKU already exists.', {
        sku,
        productId: existingSku.id,
      });
    }

    const duplicated = await tx.product.create({
      data: {
        name_en: product.name_en,
        name_pl: product.name_pl,
        name_de: product.name_de,
        description_en: product.description_en,
        description_pl: product.description_pl,
        description_de: product.description_de,
        supplierName: product.supplierName,
        supplierLink: product.supplierLink,
        priceComment: product.priceComment,
        stock: product.stock,
        price: product.price,
        sizeLength: product.sizeLength,
        sizeWidth: product.sizeWidth,
        weight: product.weight,
        length: product.length,
        parameters:
          (normalizeProductParameterValues(product.parameters) as unknown as Prisma.InputJsonValue) ||
          [],
        imageLinks: product.imageLinks || [],
        defaultPriceGroupId: product.defaultPriceGroupId ?? null,
        ean: product.ean ?? null,
        gtin: product.gtin ?? null,
        asin: product.asin ?? null,
        sku,
      },
    });
    return toProductRecord(duplicated as FullPrismaProduct);
  },

  addProductImages: async (productId, imageFileIds) => {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;
    const now = Date.now();
    await tx.productImage.createMany({
      data: normalizedIds.map((imageFileId: string, index: number) => ({
        productId,
        imageFileId,
        assignedAt: new Date(now - index),
      })),
      skipDuplicates: true,
    });
  },

  replaceProductImages: async (productId, imageFileIds) => {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    await tx.productImage.deleteMany({ where: { productId } });
    if (normalizedIds.length === 0) return;

    const now = Date.now();
    await tx.productImage.createMany({
      data: normalizedIds.map((imageFileId: string, index: number) => ({
        productId,
        imageFileId,
        assignedAt: new Date(now - index),
      })),
    });
  },

  replaceProductCatalogs: async (productId, catalogIds) => {
    await tx.productCatalog.deleteMany({ where: { productId } });
    if (catalogIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const existing = await tx.catalog.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await tx.productCatalog.createMany({
      data: validIds.map((catalogId: string) => ({ productId, catalogId })),
    });
  },

  replaceProductCategory: async (productId, categoryId) => {
    await tx.productCategoryAssignment.deleteMany({ where: { productId } });
    const normalized = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (!normalized) return;
    const existing = await tx.productCategory.findUnique({
      where: { id: normalized },
      select: { id: true },
    });
    if (!existing) return;
    await tx.productCategoryAssignment.create({
      data: { productId, categoryId: normalized },
    });
  },

  replaceProductTags: async (productId, tagIds) => {
    await tx.productTagAssignment.deleteMany({ where: { productId } });
    if (tagIds.length === 0) return;
    const uniqueIds = Array.from(new Set(tagIds));
    const existing = await tx.productTag.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await tx.productTagAssignment.createMany({
      data: validIds.map((tagId: string) => ({ productId, tagId })),
    });
  },

  replaceProductProducers: async (productId, producerIds) => {
    await tx.productProducerAssignment.deleteMany({ where: { productId } });
    if (producerIds.length === 0) return;
    const uniqueIds = Array.from(new Set(producerIds));
    const existing = await tx.producer.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await tx.productProducerAssignment.createMany({
      data: validIds.map((producerId: string) => ({ productId, producerId })),
    });
  },

  replaceProductNotes: async (productId, noteIds) => {
    const uniqueIds = Array.from(new Set(noteIds.filter((id: string) => id?.trim()))).map((id: string) =>
      id.trim()
    );
    await tx.product.update({
      where: { id: productId },
      data: { noteIds: uniqueIds },
    });
  },

  removeProductImage: async (productId, imageFileId) => {
    await tx.productImage.deleteMany({
      where: { productId, imageFileId },
    });
  },

  countProductsByImageFileId: async (imageFileId) => {
    return tx.productImage.count({ where: { imageFileId } });
  },
  
  createProductInTransaction: async <T>(
    _callback: (txClient: ProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> => {
    throw internalError('createProductInTransaction cannot be called within a transaction');
  },
});

export const prismaProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    const where = buildProductWhere(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'desc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } }
            }
          }
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return products.map(p => toProductRecord(p as FullPrismaProduct));
  },

  async countProducts(filters: ProductFilters) {
    const where = buildProductWhere(filters);
    return prisma.product.count({ where });
  },

  async getProductsWithCount(filters: ProductFilters): Promise<{ products: ProductWithImages[]; total: number }> {
    const where = buildProductWhere(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            include: { imageFile: true },
            orderBy: { assignedAt: 'desc' },
          },
          catalogs: {
            include: {
              catalog: {
                include: { languages: { select: { languageId: true } } },
              },
            },
          },
          categories: { select: { categoryId: true } },
          tags: { select: { tagId: true } },
          producers: { select: { producerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: rawProducts.map(p => toProductRecord(p as FullPrismaProduct)),
      total,
    };
  },

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'desc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } }
            }
          }
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  async getProductBySku(sku: string) {
    const product = await prisma.product.findUnique({ 
      where: { sku },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  async findProductByBaseId(baseProductId: string) {
    const product = await prisma.product.findFirst({
      where: { baseProductId },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  async createProduct(data: CreateProductInput) {
    if (data.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: data.sku },
        select: { id: true },
      });
      if (existing) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku,
          productId: existing.id,
        });
      }
    }

    const { categoryId: _cat, id, ...rest } = data;
    const normalizedParameters =
      rest.parameters !== undefined
        ? normalizeProductParameterValues(rest.parameters)
        : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters:
              normalizedParameters as unknown as Prisma.InputJsonValue,
        }
        : {}),
      ...(id ? { id } : {}),
    }) as Prisma.ProductCreateInput;

    try {
      const product = await prisma.product.create({ data: cleanData });
      return toProductRecord(product as FullPrismaProduct);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.['target']) &&
        (error.meta?.['target'] as string[]).includes('sku')
      ) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku ?? null,
        });
      }
      throw error;
    }
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;

    const { categoryId: _cat, id: _id, ...rest } = data;
    const normalizedParameters =
      rest.parameters !== undefined
        ? normalizeProductParameterValues(rest.parameters)
        : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters:
              normalizedParameters as unknown as Prisma.InputJsonValue,
        }
        : {}),
    }) as Prisma.ProductUpdateInput;

    const product = await prisma.product.update({ 
      where: { id }, 
      data: cleanData,
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return toProductRecord(product as FullPrismaProduct);
  },

  async deleteProduct(id: string) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await prisma.product.delete({ 
      where: { id },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      }
    });
    return toProductRecord(product as FullPrismaProduct);
  },

  async duplicateProduct(id: string, sku: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    const existingSku = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existingSku) {
      throw conflictError('A product with this SKU already exists.', {
        sku,
        productId: existingSku.id,
      });
    }

    const duplicated = await prisma.product.create({
      data: {
        name_en: product.name_en,
        name_pl: product.name_pl,
        name_de: product.name_de,
        description_en: product.description_en,
        description_pl: product.description_pl,
        description_de: product.description_de,
        supplierName: product.supplierName,
        supplierLink: product.supplierLink,
        priceComment: product.priceComment,
        stock: product.stock,
        price: product.price,
        sizeLength: product.sizeLength,
        sizeWidth: product.sizeWidth,
        weight: product.weight,
        length: product.length,
        parameters:
          (normalizeProductParameterValues(product.parameters) as unknown as Prisma.InputJsonValue) ||
          [],
        imageLinks: product.imageLinks || [],
        defaultPriceGroupId: product.defaultPriceGroupId ?? null,
        ean: product.ean ?? null,
        gtin: product.gtin ?? null,
        asin: product.asin ?? null,
        sku,
      },
    });
    return toProductRecord(duplicated as FullPrismaProduct);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;
    const now = Date.now();
    await prisma.productImage.createMany({
      data: normalizedIds.map((imageFileId: string, index: number) => ({
        productId,
        imageFileId,
        assignedAt: new Date(now - index),
      })),
      skipDuplicates: true,
    });
  },

  async replaceProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.productImage.deleteMany({ where: { productId } });
      if (normalizedIds.length === 0) return;

      const now = Date.now();
      await tx.productImage.createMany({
        data: normalizedIds.map((imageFileId: string, index: number) => ({
          productId,
          imageFileId,
          assignedAt: new Date(now - index),
        })),
      });
    });
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    await prisma.productCatalog.deleteMany({ where: { productId } });
    if (catalogIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const existing = await prisma.catalog.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productCatalog.createMany({
      data: validIds.map((catalogId: string) => ({ productId, catalogId })),
    });
  },

  async replaceProductCategory(productId: string, categoryId: string | null) {
    await prisma.productCategoryAssignment.deleteMany({ where: { productId } });
    const normalized = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (!normalized) return;
    const existing = await prisma.productCategory.findUnique({
      where: { id: normalized },
      select: { id: true },
    });
    if (!existing) return;
    await prisma.productCategoryAssignment.create({
      data: { productId, categoryId: normalized },
    });
  },

  async replaceProductTags(productId: string, tagIds: string[]) {
    await prisma.productTagAssignment.deleteMany({ where: { productId } });
    if (tagIds.length === 0) return;
    const uniqueIds = Array.from(new Set(tagIds));
    const existing = await prisma.productTag.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productTagAssignment.createMany({
      data: validIds.map((tagId: string) => ({ productId, tagId })),
    });
  },

  async replaceProductProducers(productId: string, producerIds: string[]) {
    await prisma.productProducerAssignment.deleteMany({ where: { productId } });
    if (producerIds.length === 0) return;
    const uniqueIds = Array.from(new Set(producerIds));
    const existing = await prisma.producer.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productProducerAssignment.createMany({
      data: validIds.map((producerId: string) => ({ productId, producerId })),
    });
  },

  async replaceProductNotes(productId: string, noteIds: string[]) {
    const uniqueIds = Array.from(new Set(noteIds.filter((id: string) => id?.trim()))).map((id: string) =>
      id.trim()
    );
    await prisma.product.update({
      where: { id: productId },
      data: { noteIds: uniqueIds },
    });
  },

  async removeProductImage(productId: string, imageFileId: string) {
    await prisma.productImage.deleteMany({
      where: { productId, imageFileId },
    });
  },

  async countProductsByImageFileId(imageFileId: string) {
    return prisma.productImage.count({ where: { imageFileId } });
  },

  async createProductInTransaction<T>(
    callback: (txClient: ProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const transactionalRepo = createTransactionalRepository(tx);
      return callback(transactionalRepo as ProductRepository & Prisma.TransactionClient);
    });
  },
};
