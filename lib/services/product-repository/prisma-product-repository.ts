import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { CatalogRecord, ImageFileRecord, ProductRecord } from "@/lib/types";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from "@/lib/services/product-repository/types";

const buildProductWhere = (filters: ProductFilters) => {
  const where: Prisma.ProductWhereInput = {
    sku: {
      contains: filters.sku,
    },
  };

  if (filters.search) {
    where.OR = [
      { name_en: { contains: filters.search } },
      { name_pl: { contains: filters.search } },
      { name_de: { contains: filters.search } },
      { description_en: { contains: filters.search } },
      { description_pl: { contains: filters.search } },
      { description_de: { contains: filters.search } },
    ];
  }

  if (filters.minPrice) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      gte: parseInt(filters.minPrice, 10),
    };
  }
  if (filters.maxPrice) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      lte: parseInt(filters.maxPrice, 10),
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
  createdAt: Date;
  updatedAt: Date;
  languages?: { languageId: string }[];
}): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description ?? null,
  isDefault: catalog.isDefault,
  createdAt: catalog.createdAt,
  updatedAt: catalog.updatedAt,
  languageIds: catalog.languages?.map((entry) => entry.languageId) ?? [],
});

const toProductRecord = (product: {
  id: string;
  sku: string | null;
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
}): ProductRecord => ({
  id: product.id,
  sku: product.sku ?? null,
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
});

export const prismaProductRepository: ProductRepository = {
  async getProducts(filters) {
    const where = buildProductWhere(filters);
    const products = await prisma.product.findMany({
      where,
      include: {
        images: { include: { imageFile: true } },
        catalogs: {
          include: { catalog: { include: { languages: { select: { languageId: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: "desc" },
        },
        catalogs: {
          include: { catalog: { include: { languages: { select: { languageId: true } } } } },
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

  async createProduct(data: CreateProductInput) {
    const product = await prisma.product.create({ data });
    return toProductRecord(product);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) return null;
    const product = await prisma.product.update({ where: { id }, data });
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
      throw new Error("A product with this SKU already exists.");
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

  async removeProductImage(productId: string, imageFileId: string) {
    await prisma.productImage.deleteMany({
      where: { productId, imageFileId },
    });
  },

  async countProductsByImageFileId(imageFileId: string) {
    return prisma.productImage.count({ where: { imageFileId } });
  },
};
