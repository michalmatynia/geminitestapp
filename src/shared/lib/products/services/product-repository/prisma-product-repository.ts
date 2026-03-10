import 'server-only';


import {
  type CreateProductInput,
  type ProductCreateInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
  ProductImageRecord,
} from '@/shared/contracts/products';
import { conflictError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';
import { Prisma } from '@/shared/lib/db/prisma-client';

import { buildProductWhere } from './prisma-product-repository.filters';
import {
  removeUndefined,
  normalizeImageFileIds,
  normalizeProductParameterValues,
} from './prisma-product-repository.helpers';
import {
  toProductRecord,
  toProductListRecord,
  toProductImageRecord,
  type FullPrismaProduct,
  type SlimPrismaListProduct,
} from './prisma-product-repository.mappers';

const pagedProductListSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  sku: true,
  baseProductId: true,
  defaultPriceGroupId: true,
  ean: true,
  gtin: true,
  asin: true,
  name_en: true,
  name_pl: true,
  name_de: true,
  description_en: true,
  description_pl: true,
  description_de: true,
  supplierName: true,
  supplierLink: true,
  priceComment: true,
  stock: true,
  price: true,
  sizeLength: true,
  sizeWidth: true,
  weight: true,
  length: true,
  published: true,
  catalogId: true,
  parameters: true,
  imageLinks: true,
  noteIds: true,
  createdAt: true,
  updatedAt: true,
  categories: {
    select: { categoryId: true },
  },
  images: {
    orderBy: { assignedAt: 'desc' },
    take: 1,
    include: { imageFile: true },
  },
});

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
      select: pagedProductListSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return products.map((product) => toProductListRecord(product as SlimPrismaListProduct));
  },

  getProductIds: async (filters) => {
    const where = buildProductWhere(filters);
    const products = await tx.product.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((product) => product.id);
  },

  countProducts: (filters) => tx.product.count({ where: buildProductWhere(filters) }),

  async getProductsWithCount(filters) {
    const where = buildProductWhere(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [rawProducts, total] = await Promise.all([
      tx.product.findMany({
        where,
        select: pagedProductListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.product.count({ where }),
    ]);
    return {
      products: rawProducts.map((product) => toProductListRecord(product as SlimPrismaListProduct)),
      total,
    };
  },

  getProductById: async (id) => {
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'asc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } },
            },
          },
        },
        categories: { select: { categoryId: true } },
        tags: { select: { productId: true, tagId: true, assignedAt: true } },
        producers: { select: { productId: true, producerId: true, assignedAt: true } },
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
      },
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  getProductsBySkus: async (skus) => {
    if (skus.length === 0) return [];
    const products = await tx.product.findMany({
      where: { sku: { in: skus } },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      },
    });
    return products.map((p) => toProductRecord(p as FullPrismaProduct));
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
      },
    });
    return product ? toProductRecord(product as FullPrismaProduct) : null;
  },

  findProductsByBaseIds: async (baseIds) => {
    if (baseIds.length === 0) return [];
    const products = await tx.product.findMany({
      where: { baseProductId: { in: baseIds } },
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      },
    });
    return products.map((p) => toProductRecord(p as FullPrismaProduct));
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

    const {
      categoryId: _cat,
      catalogIds: _cats,
      tagIds: _tags,
      producerIds: _prods,
      noteIds: _notes,
      imageFileIds: _imgs,
      studioProjectId: _studio,
      imageLinks: _links,
      imageBase64s: _base64,
      id,
      ...rest
    } = data;
    const normalizedParameters =
      rest.parameters !== undefined ? normalizeProductParameterValues(rest.parameters) : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters: normalizedParameters as Prisma.JsonValue,
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
          error,
        });
      }
      throw error;
    }
  },

  bulkCreateProducts: async (data: ProductCreateInput[]) => {
    if (data.length === 0) return 0;
    const cleanData = data.map((item) => {
      const { categoryId: _cat, id, ...rest } = item;
      const normalizedParameters =
        rest.parameters !== undefined
          ? normalizeProductParameterValues(rest.parameters)
          : undefined;
      return removeUndefined({
        ...rest,
        ...(normalizedParameters !== undefined
          ? {
            parameters: normalizedParameters as Prisma.InputJsonValue,
          }
          : {}),
        ...(id ? { id } : {}),
      }) as Prisma.ProductCreateManyInput;
    });

    const result = await tx.product.createMany({
      data: cleanData,
      skipDuplicates: true,
    });
    return result.count;
  },

  updateProduct: async (id, data) => {
    const productExists = await tx.product.findUnique({ where: { id } });
    if (!productExists) return null;

    const {
      categoryId: _cat,
      catalogIds: _cats,
      tagIds: _tags,
      producerIds: _prods,
      noteIds: _notes,
      imageFileIds: _imgs,
      studioProjectId: _studio,
      imageLinks: _links,
      imageBase64s: _base64,
      id: _id,
      ...rest
    } = data;
    const normalizedParameters =
      rest.parameters !== undefined ? normalizeProductParameterValues(rest.parameters) : undefined;
    const cleanData = removeUndefined({
      ...rest,
      ...(normalizedParameters !== undefined
        ? {
          parameters: normalizedParameters as Prisma.InputJsonValue,
        }
        : {}),
    }) as Prisma.ProductUpdateInput;

    const product = await tx.product.update({
      where: { id },
      data: cleanData,
    });
    return getProductByIdInternal(tx, product.id);
  },

  deleteProduct: async (id) => {
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'asc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } },
            },
          },
        },
        categories: { select: { categoryId: true } },
        tags: { select: { productId: true, tagId: true, assignedAt: true } },
        producers: { select: { productId: true, producerId: true, assignedAt: true } },
      },
    });
    if (!product) return null;

    await tx.product.delete({ where: { id } });
    return toProductRecord(product as FullPrismaProduct);
  },

  duplicateProduct: async (id, sku) => {
    const source = await tx.product.findUnique({
      where: { id },
      include: {
        images: true,
        catalogs: true,
        categories: true,
        tags: true,
        producers: true,
      },
    });
    if (!source) return null;

    const {
      id: _sid,
      sku: _sku,
      createdAt: _c,
      updatedAt: _u,
      images,
      catalogs,
      categories,
      tags,
      producers,
      ...rest
    } = source;

    const product = await tx.product.create({
      data: {
        ...rest,
        parameters: rest.parameters as Prisma.InputJsonValue,
        sku,
        published: false,
      },
    });

    if (images && images.length > 0) {
      await tx.productImage.createMany({
        data: images.map((img) => ({
          productId: product.id,
          imageFileId: img.imageFileId,
          assignedAt: img.assignedAt,
        })),
      });
    }

    if (catalogs && catalogs.length > 0) {
      await tx.productCatalog.createMany({
        data: catalogs.map((cat) => ({
          productId: product.id,
          catalogId: cat.catalogId,
          assignedAt: cat.assignedAt,
        })),
      });
    }

    if (categories) {
      await tx.productCategoryAssignment.create({
        data: {
          productId: product.id,
          categoryId: categories.categoryId,
          assignedAt: categories.assignedAt,
        },
      });
    }

    if (tags && tags.length > 0) {
      await tx.productTagAssignment.createMany({
        data: tags.map((t) => ({
          productId: product.id,
          tagId: t.tagId,
          assignedAt: t.assignedAt,
        })),
      });
    }

    if (producers && producers.length > 0) {
      await tx.productProducerAssignment.createMany({
        data: producers.map((p) => ({
          productId: product.id,
          producerId: p.producerId,
          assignedAt: p.assignedAt,
        })),
      });
    }

    return getProductByIdInternal(tx, product.id);
  },

  getProductImages: async (productId) => {
    const images = await tx.productImage.findMany({
      where: { productId },
      include: { imageFile: true },
      orderBy: { assignedAt: 'asc' },
    });
    return images.map(toProductImageRecord).filter((i): i is ProductImageRecord => i !== null);
  },

  addProductImages: async (productId, imageFileIds) => {
    const uniqueIds = normalizeImageFileIds(imageFileIds);
    if (uniqueIds.length === 0) return;

    await tx.productImage.createMany({
      data: uniqueIds.map((imageFileId) => ({
        productId,
        imageFileId,
      })),
      skipDuplicates: true,
    });
  },

  replaceProductImages: async (productId, imageFileIds) => {
    const uniqueIds = normalizeImageFileIds(imageFileIds);
    await tx.productImage.deleteMany({ where: { productId } });
    if (uniqueIds.length > 0) {
      await tx.productImage.createMany({
        data: uniqueIds.map((imageFileId) => ({
          productId,
          imageFileId,
        })),
      });
    }
  },

  replaceProductCatalogs: async (productId, catalogIds) => {
    const uniqueIds = Array.from(new Set(catalogIds));
    await tx.productCatalog.deleteMany({ where: { productId } });
    if (uniqueIds.length > 0) {
      await tx.productCatalog.createMany({
        data: uniqueIds.map((catalogId) => ({ productId, catalogId })),
      });
    }
  },

  replaceProductCategory: async (productId, categoryId) => {
    await tx.productCategoryAssignment.deleteMany({ where: { productId } });
    if (categoryId) {
      await tx.productCategoryAssignment.create({
        data: { productId, categoryId },
      });
    }
  },

  replaceProductTags: async (productId, tagIds) => {
    const uniqueIds = Array.from(new Set(tagIds));
    await tx.productTagAssignment.deleteMany({ where: { productId } });
    if (uniqueIds.length > 0) {
      await tx.productTagAssignment.createMany({
        data: uniqueIds.map((tagId) => ({ productId, tagId })),
      });
    }
  },

  replaceProductProducers: async (productId, producerIds) => {
    await tx.productProducerAssignment.deleteMany({ where: { productId } });
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
    const uniqueIds = Array.from(new Set(noteIds.filter((id: string) => id?.trim()))).map(
      (id: string) => id.trim()
    );
    await tx.product.update({
      where: { id: productId },
      data: { noteIds: uniqueIds },
    });
  },

  bulkReplaceProductCatalogs: async (productIds, catalogIds) => {
    if (productIds.length === 0) return;
    const uniqueCatalogIds = Array.from(new Set(catalogIds));
    const existing = await tx.catalog.findMany({
      where: { id: { in: uniqueCatalogIds } },
      select: { id: true },
    });
    const validCatalogIds = existing.map((entry: { id: string }) => entry.id);

    await tx.productCatalog.deleteMany({
      where: { productId: { in: productIds } },
    });
    if (validCatalogIds.length > 0) {
      await tx.productCatalog.createMany({
        data: productIds.flatMap((productId) =>
          validCatalogIds.map((catalogId) => ({ productId, catalogId }))
        ),
        skipDuplicates: true,
      });
    }
  },

  bulkAddProductCatalogs: async (productIds, catalogIds) => {
    if (productIds.length === 0 || catalogIds.length === 0) return;
    const uniqueCatalogIds = Array.from(new Set(catalogIds));
    const existing = await tx.catalog.findMany({
      where: { id: { in: uniqueCatalogIds } },
      select: { id: true },
    });
    const validCatalogIds = existing.map((entry: { id: string }) => entry.id);
    if (validCatalogIds.length === 0) return;

    await tx.productCatalog.createMany({
      data: productIds.flatMap((productId) =>
        validCatalogIds.map((catalogId) => ({ productId, catalogId }))
      ),
      skipDuplicates: true,
    });
  },

  bulkRemoveProductCatalogs: async (productIds, catalogIds) => {
    if (productIds.length === 0 || catalogIds.length === 0) return;
    await tx.productCatalog.deleteMany({
      where: {
        productId: { in: productIds },
        catalogId: { in: catalogIds },
      },
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
    callback: (txClient: ProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const txRepo = createTransactionalRepository(tx);
      const txClient = Object.assign(tx, txRepo);
      return callback(txClient as ProductRepository & Prisma.TransactionClient);
    });
  },
});

async function getProductByIdInternal(tx: Prisma.TransactionClient, id: string) {
  const product = await tx.product.findUnique({
    where: { id },
    include: {
      images: {
        include: { imageFile: true },
        orderBy: { assignedAt: 'asc' },
      },
      catalogs: {
        include: {
          catalog: {
            include: { languages: { select: { languageId: true } } },
          },
        },
      },
      categories: { select: { categoryId: true } },
      tags: { select: { productId: true, tagId: true, assignedAt: true } },
      producers: { select: { productId: true, producerId: true, assignedAt: true } },
    },
  });
  return product ? toProductRecord(product as FullPrismaProduct) : null;
}

export const prismaProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    return createTransactionalRepository(prisma).getProducts(filters);
  },

  async getProductIds(filters: ProductFilters) {
    return createTransactionalRepository(prisma).getProductIds(filters);
  },

  async countProducts(filters: ProductFilters) {
    return createTransactionalRepository(prisma).countProducts(filters);
  },

  async getProductsWithCount(filters: ProductFilters) {
    return createTransactionalRepository(prisma).getProductsWithCount(filters);
  },

  async getProductById(id: string) {
    return createTransactionalRepository(prisma).getProductById(id);
  },

  async getProductBySku(sku: string) {
    return createTransactionalRepository(prisma).getProductBySku(sku);
  },

  async getProductsBySkus(skus: string[]) {
    return createTransactionalRepository(prisma).getProductsBySkus(skus);
  },

  async findProductByBaseId(baseProductId: string) {
    return createTransactionalRepository(prisma).findProductByBaseId(baseProductId);
  },

  async findProductsByBaseIds(baseIds: string[]) {
    return createTransactionalRepository(prisma).findProductsByBaseIds(baseIds);
  },

  async createProduct(data: CreateProductInput) {
    return createTransactionalRepository(prisma).createProduct(data);
  },

  async bulkCreateProducts(data: ProductCreateInput[]) {
    return createTransactionalRepository(prisma).bulkCreateProducts(data);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    return createTransactionalRepository(prisma).updateProduct(id, data);
  },

  async deleteProduct(id: string) {
    return createTransactionalRepository(prisma).deleteProduct(id);
  },

  async duplicateProduct(id: string, sku: string) {
    return createTransactionalRepository(prisma).duplicateProduct(id, sku);
  },

  async getProductImages(productId: string) {
    return createTransactionalRepository(prisma).getProductImages(productId);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    return createTransactionalRepository(prisma).addProductImages(productId, imageFileIds);
  },

  async replaceProductImages(productId: string, imageFileIds: string[]) {
    return createTransactionalRepository(prisma).replaceProductImages(productId, imageFileIds);
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    return createTransactionalRepository(prisma).replaceProductCatalogs(productId, catalogIds);
  },

  async replaceProductCategory(productId: string, categoryId: string | null) {
    return createTransactionalRepository(prisma).replaceProductCategory(productId, categoryId);
  },

  async replaceProductTags(productId: string, tagIds: string[]) {
    return createTransactionalRepository(prisma).replaceProductTags(productId, tagIds);
  },

  async replaceProductProducers(productId: string, producerIds: string[]) {
    return createTransactionalRepository(prisma).replaceProductProducers(productId, producerIds);
  },

  async replaceProductNotes(productId: string, noteIds: string[]) {
    return createTransactionalRepository(prisma).replaceProductNotes(productId, noteIds);
  },

  async bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[]) {
    return createTransactionalRepository(prisma).bulkReplaceProductCatalogs(productIds, catalogIds);
  },

  async bulkAddProductCatalogs(productIds: string[], catalogIds: string[]) {
    return createTransactionalRepository(prisma).bulkAddProductCatalogs(productIds, catalogIds);
  },

  async bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[]) {
    return createTransactionalRepository(prisma).bulkRemoveProductCatalogs(productIds, catalogIds);
  },

  async removeProductImage(productId: string, imageFileId: string) {
    return createTransactionalRepository(prisma).removeProductImage(productId, imageFileId);
  },

  async countProductsByImageFileId(imageFileId: string) {
    return createTransactionalRepository(prisma).countProductsByImageFileId(imageFileId);
  },

  async createProductInTransaction<T>(
    callback: (txClient: ProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const txRepo = createTransactionalRepository(tx);
      const txClient = Object.assign(tx, txRepo);
      return callback(txClient as ProductRepository & Prisma.TransactionClient);
    });
  },
};
