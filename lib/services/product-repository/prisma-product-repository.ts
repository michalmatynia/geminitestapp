import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { conflictError } from "@/lib/errors/app-error";
import type { CatalogRecord, ImageFileRecord, ProductRecord } from "@/types";
import type { ProductParameterValue } from "@/types/products";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from "@/types/services/product-repository";

// Helper to remove undefined keys for exactOptionalPropertyTypes compliance
function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

const buildProductWhere = (filters: ProductFilters) => {
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
      gte: typeof filters.minPrice === 'string' ? parseInt(filters.minPrice, 10) : filters.minPrice,
    };
  }
  if (filters.maxPrice !== undefined) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      lte: typeof filters.maxPrice === 'string' ? parseInt(filters.maxPrice, 10) : filters.maxPrice,
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
    if (filters.catalogId === "unassigned") {
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
  createdAt: imageFile.createdAt,
  updatedAt: imageFile.updatedAt,
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
  createdAt: catalog.createdAt,
  updatedAt: catalog.updatedAt,
  languageIds: catalog.languages?.map((entry) => entry.languageId) ?? [],
  priceGroupIds: Array.isArray(catalog.priceGroupIds)
    ? catalog.priceGroupIds
    : [],
});

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
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const prismaProductRepository: ProductRepository = {
  async getProducts(filters) {
    const where = buildProductWhere(filters);
    const page = filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined;
    const pageSize = filters.pageSize ? (typeof filters.pageSize === 'string' ? parseInt(filters.pageSize, 10) : filters.pageSize) : undefined;
    
    const findManyArgs: Prisma.ProductFindManyArgs = {
      where,
      include: {
        images: { include: { imageFile: true } },
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
      },
      orderBy: { createdAt: "desc" },
    };

    if (page && pageSize) {
      findManyArgs.skip = (page - 1) * pageSize;
      findManyArgs.take = pageSize;
    } else if (pageSize) {
      findManyArgs.take = pageSize;
    }

    type ProductWithRelations = Prisma.ProductGetPayload<{
      include: {
        images: { include: { imageFile: true } };
        catalogs: {
          include: { catalog: { include: { languages: { select: { languageId: true } } } } };
        };
      };
    }>;

    const products = (await prisma.product.findMany(findManyArgs)) as ProductWithRelations[];
    
    return products.map((product) => ({
      ...toProductRecord(product),
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
        catalog: toCatalogRecord(entry.catalog),
      })),
    }));
  },

  async countProducts(filters) {
    const where = buildProductWhere(filters);
    return prisma.product.count({ where });
  },

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: "desc" },
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
      },
    });
    if (!product) return null;
    return {
      ...toProductRecord(product),
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
        catalog: toCatalogRecord(entry.catalog),
      })),
    };
  },

  async getProductBySku(sku: string) {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) return null;
    return toProductRecord(product);
  },

  async findProductByBaseId(baseProductId: string) {
    const product = await prisma.product.findFirst({
      where: { baseProductId },
    });
    if (!product) return null;
    return toProductRecord(product);
  },

  async createProduct(data: CreateProductInput) {
    if (data.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: data.sku },
        select: { id: true },
      });
      if (existing) {
        throw conflictError("A product with this SKU already exists.", {
          sku: data.sku,
          productId: existing.id,
        });
      }
    }

    const cleanData = removeUndefined(data) as Prisma.ProductCreateInput;
    try {
      const product = await prisma.product.create({ data: cleanData });
      return toProductRecord(product);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes("sku")
      ) {
        throw conflictError("A product with this SKU already exists.", {
          sku: data.sku ?? null,
        });
      }
      throw error;
    }
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const cleanData = removeUndefined(data) as Prisma.ProductUpdateInput;
    const product = await prisma.product.update({ where: { id }, data: cleanData });
    return toProductRecord(product);
  },

  async deleteProduct(id: string) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await prisma.product.delete({ where: { id } });
    return toProductRecord(product);
  },

  async duplicateProduct(id: string, sku: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    const existingSku = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existingSku) {
      throw conflictError("A product with this SKU already exists.", {
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
    return toProductRecord(duplicated);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    if (imageFileIds.length === 0) return;
    await prisma.productImage.createMany({
      data: imageFileIds.map((imageFileId) => ({ productId, imageFileId })),
      skipDuplicates: true,
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
    const existingIds = new Set(existing.map((entry) => entry.id));
    const validIds = uniqueIds.filter((id) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productCatalog.createMany({
      data: validIds.map((catalogId) => ({ productId, catalogId })),
    });
  },

  async replaceProductCategories(productId: string, categoryIds: string[]) {
    await prisma.productCategoryAssignment.deleteMany({ where: { productId } });
    if (categoryIds.length === 0) return;
    const uniqueIds = Array.from(new Set(categoryIds));
    const existing = await prisma.productCategory.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry) => entry.id));
    const validIds = uniqueIds.filter((id) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productCategoryAssignment.createMany({
      data: validIds.map((categoryId) => ({ productId, categoryId })),
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
    const existingIds = new Set(existing.map((entry) => entry.id));
    const validIds = uniqueIds.filter((id) => existingIds.has(id));
    if (validIds.length === 0) return;
    await prisma.productTagAssignment.createMany({
      data: validIds.map((tagId) => ({ productId, tagId })),
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
};
