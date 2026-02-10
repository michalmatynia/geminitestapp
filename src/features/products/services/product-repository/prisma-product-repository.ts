import 'server-only';

import { Prisma } from '@prisma/client';

import type { CatalogRecord, ProductRecord } from '@/features/products/types';
import type { ProductParameterValue } from '@/features/products/types';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from '@/features/products/types/services/product-repository';
import { conflictError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';
import type { ImageFileRecord } from '@/shared/types/domain/files';

// Helper to remove undefined keys for exactOptionalPropertyTypes compliance
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

const buildProductWhere = (filters: ProductFilters): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = {};

  if (filters.sku) {
    where.sku = {
      contains: filters.sku,
      mode: 'insensitive',
    };
  }

  if (filters.search) {
    // If a specific language is selected, only search in that language's name field
    if (filters.searchLanguage) {
      // searchLanguage is like "name_en", "name_pl", "name_de"
      where.OR = [
        { [filters.searchLanguage]: { contains: filters.search, mode: 'insensitive' } },
      ];
    } else {
      // Search all language fields
      where.OR = [
        { name_en: { contains: filters.search, mode: 'insensitive' } },
        { name_pl: { contains: filters.search, mode: 'insensitive' } },
        { name_de: { contains: filters.search, mode: 'insensitive' } },
        { description_en: { contains: filters.search, mode: 'insensitive' } },
        { description_pl: { contains: filters.search, mode: 'insensitive' } },
        { description_de: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
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

  return where;
};

const toImageFileRecord = (imageFile: {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}): ImageFileRecord => ({
  id: imageFile.id,
  filename: imageFile.filename,
  filepath: imageFile.filepath,
  mimetype: imageFile.mimetype,
  size: imageFile.size,
  width: imageFile.width ?? null,
  height: imageFile.height ?? null,
  tags: imageFile.tags ?? [],
  createdAt: imageFile.createdAt.toISOString(),
  updatedAt: imageFile.updatedAt.toISOString(),
});

const toCatalogRecord = (catalog: {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId: string | null;
  defaultPriceGroupId: string | null;
  priceGroupIds: string[];
  createdAt: Date;
  updatedAt: Date;
  languages?: { languageId: string }[];
}): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description ?? null,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId ?? null,
  defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
  createdAt: catalog.createdAt.toISOString(),
  updatedAt: catalog.updatedAt.toISOString(),
  languageIds: catalog.languages?.map((entry: { languageId: string }) => entry.languageId) ?? [],
  priceGroupIds: Array.isArray(catalog.priceGroupIds)
    ? catalog.priceGroupIds
    : [],
});

const toProductImageRecord = (image: {
  productId: string;
  imageFileId: string;
  assignedAt: Date;
  imageFile?: {
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    width: number | null;
    height: number | null;
    tags: string[] | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}) => {
  if (!image.imageFile) return null;
  return {
    productId: image.productId,
    imageFileId: image.imageFileId,
    assignedAt: image.assignedAt,
    imageFile: toImageFileRecord(image.imageFile),
  };
};

const toProductRecord = (product: {
  id: string;
  sku: string | null;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
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
  parameters?: Prisma.JsonValue | null;
  imageLinks: string[];
  imageBase64s: string[];
  noteIds?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductRecord => ({
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
  parameters: Array.isArray(product.parameters) ? (product.parameters as unknown as ProductParameterValue[]) : [],
  imageLinks: Array.isArray(product.imageLinks) ? product.imageLinks : [],
  imageBase64s: Array.isArray(product.imageBase64s) ? product.imageBase64s : [],
  noteIds: Array.isArray(product.noteIds) ? product.noteIds : [],
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
  categoryId: (product as unknown as { categories?: { categoryId: string } | null }).categories?.categoryId ?? null,
});

// Helper function to create a ProductRepository instance that uses a Prisma TransactionClient
const createTransactionalRepository = (tx: Prisma.TransactionClient): ProductRepository => ({
  // Implement all methods of ProductRepository using the provided 'tx' client
  // Read operations can still use `prisma` if they don't need to see uncommitted writes from this transaction,
  // but for consistency and safety, it's better to use `tx` where possible.
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
              include: { languages: { include: { language: true } } }
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

    return products.map((product: typeof products[number]) => ({
      ...toProductRecord({
        ...product,
        imageBase64s: [],
      }),
      images: (product.images || [])
        .map((image: typeof product.images[number]) => toProductImageRecord(image))
        .filter(
          (
            image,
          ): image is NonNullable<ReturnType<typeof toProductImageRecord>> =>
            image !== null
        ),
      catalogs: (product.catalogs || []).map((entry: typeof product.catalogs[number]) => ({
        productId: entry.productId,
        catalogId: entry.catalogId,
        assignedAt: entry.assignedAt,
        catalog: toCatalogRecord(entry.catalog),
      })),
      categoryId: (product.categories as unknown as { categoryId: string } | null)?.categoryId ?? null,
      tags: (product.tags || []).map((t: { tagId: string }) => ({ tagId: t.tagId })),
      producers: (product.producers || []).map((p: { producerId: string }) => ({
        producerId: p.producerId,
      })),
    }));
  },

  countProducts: (filters) => tx.product.count({ where: buildProductWhere(filters) }),

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
              include: { languages: { include: { language: true } } }
            }
          }
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
    });
    if (!product) return null;
    return {
      ...toProductRecord({
        ...product,
        imageBase64s: [],
      }),
      images: (product.images || [])
        .map((image: typeof product.images[number]) => toProductImageRecord(image))
        .filter(
          (
            image,
          ): image is NonNullable<ReturnType<typeof toProductImageRecord>> =>
            image !== null
        ),
      catalogs: (product.catalogs || []).map((entry: typeof product.catalogs[number]) => ({
        productId: entry.productId,
        catalogId: entry.catalogId,
        assignedAt: entry.assignedAt,
        catalog: toCatalogRecord(entry.catalog),
      })),
      categoryId: (product.categories as unknown as { categoryId: string } | null)?.categoryId ?? null,
      tags: (product.tags || []).map((t: { tagId: string }) => ({ tagId: t.tagId })),
      producers: (product.producers || []).map((p: { producerId: string }) => ({
        producerId: p.producerId,
      })),
    };
  },

  getProductBySku: async (sku) => {
    const product = await tx.product.findUnique({ where: { sku } });
    if (!product) return null;
    return toProductRecord({ ...product, imageBase64s: [] });
  },

  findProductByBaseId: async (baseProductId) => {
    const product = await tx.product.findFirst({
      where: { baseProductId },
    });
    if (!product) return null;
    return toProductRecord({ ...product, imageBase64s: [] });
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryId, id, ...rest } = data;
    const cleanData = removeUndefined({
      ...rest,
      ...(id ? { id } : {}),
    }) as Prisma.ProductCreateInput;

    try {
      const product = await tx.product.create({ data: cleanData });
      return toProductRecord({ ...product, imageBase64s: [] });
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryId, id: _id, ...rest } = data;
    const cleanData = removeUndefined(rest) as Prisma.ProductUpdateInput;

    const product = await tx.product.update({ where: { id }, data: cleanData });
    return toProductRecord({ ...product, imageBase64s: [] });
  },

  deleteProduct: async (id) => {
    const productExists = await tx.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await tx.product.delete({ where: { id } });
    return toProductRecord({ ...product, imageBase64s: [] });
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
        parameters: Array.isArray(product.parameters) ? product.parameters : [],
        imageLinks: Array.isArray(product.imageLinks) ? product.imageLinks : [],
        defaultPriceGroupId: product.defaultPriceGroupId ?? null,
        ean: product.ean ?? null,
        gtin: product.gtin ?? null,
        asin: product.asin ?? null,
        sku,
      },
    });
    return toProductRecord({ ...duplicated, imageBase64s: [] });
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
    // This method should not be called directly on the transactional repository,
    // but only on the main repository. Throw an error if it is.
    throw new Error('createProductInTransaction cannot be called within a transaction');
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
              include: {
                languages: {
                  include: { language: true }
                }
              }
            }
          },
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return products.map((product: typeof products[number]) => ({
      ...toProductRecord({
        ...product,
        imageBase64s: [],
      }),
      images: (product.images || [])
        .map((image: typeof product.images[number]) => toProductImageRecord(image))
        .filter(
          (
            image,
          ): image is NonNullable<ReturnType<typeof toProductImageRecord>> =>
            image !== null
        ),
      catalogs: (product.catalogs || []).map((entry: typeof product.catalogs[number]) => ({
        productId: entry.productId,
        catalogId: entry.catalogId,
        assignedAt: entry.assignedAt,
        catalog: toCatalogRecord(entry.catalog),
      })),
      categoryId: product.categories?.categoryId ?? null,
      tags: (product.tags || []).map((t: { tagId: string }) => ({ tagId: t.tagId })),
      producers: (product.producers || []).map((p: { producerId: string }) => ({
        producerId: p.producerId,
      })),
    }));
  },

  async countProducts(filters: ProductFilters) {
    const where = buildProductWhere(filters);
    return prisma.product.count({ where });
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
              include: {
                languages: {
                  include: { language: true }
                }
              }
            }
          },
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
    });
    if (!product) return null;
    return {
      ...toProductRecord({
        ...product,
        imageBase64s: [],
      }),
      images: (product.images || [])
        .map((image: typeof product.images[number]) => toProductImageRecord(image))
        .filter(
          (
            image,
          ): image is NonNullable<ReturnType<typeof toProductImageRecord>> =>
            image !== null
        ),
      catalogs: (product.catalogs || []).map((entry: typeof product.catalogs[number]) => ({
        productId: entry.productId,
        catalogId: entry.catalogId,
        assignedAt: entry.assignedAt,
        catalog: toCatalogRecord(entry.catalog),
      })),
      categoryId: product.categories?.categoryId ?? null,
      tags: (product.tags || []).map((t: { tagId: string }) => ({ tagId: t.tagId })),
      producers: (product.producers || []).map((p: { producerId: string }) => ({
        producerId: p.producerId,
      })),
    };
  },

  async getProductBySku(sku: string) {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) return null;
    return toProductRecord({
      ...product,
      imageBase64s: [],
    });
  },

  async findProductByBaseId(baseProductId: string) {
    const product = await prisma.product.findFirst({
      where: { baseProductId },
    });
    if (!product) return null;
    return toProductRecord({
      ...product,
      imageBase64s: [],
    });
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryId, id, ...rest } = data;
    const cleanData = removeUndefined({
      ...rest,
      ...(id ? { id } : {}),
    }) as Prisma.ProductCreateInput;

    try {
      const product = await prisma.product.create({ data: cleanData });
      return toProductRecord({
        ...product,
        imageBase64s: [],
      });
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryId, id: _id, ...rest } = data;
    const cleanData = removeUndefined(rest) as Prisma.ProductUpdateInput;

    const product = await prisma.product.update({ where: { id }, data: cleanData });
    return toProductRecord({
      ...product,
      imageBase64s: [],
    });
  },

  async deleteProduct(id: string) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await prisma.product.delete({ where: { id } });
    return toProductRecord({
      ...product,
      imageBase64s: [],
    });
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
        parameters: Array.isArray(product.parameters) ? product.parameters : [],
        imageLinks: Array.isArray(product.imageLinks) ? product.imageLinks : [],
        defaultPriceGroupId: product.defaultPriceGroupId ?? null,
        ean: product.ean ?? null,
        gtin: product.gtin ?? null,
        asin: product.asin ?? null,
        sku,
      },
    });
    return toProductRecord({
      ...duplicated,
      imageBase64s: [],
    });
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
