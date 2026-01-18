import { randomUUID } from "crypto";
import type { Filter, WithId } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type { ProductRecord, ProductWithImages } from "@/types";
import { mongoCatalogRepository } from "@/lib/services/catalog-repository/mongo-catalog-repository";
import { mongoImageFileRepository } from "@/lib/services/image-file-repository/mongo-image-file-repository";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from "@/types/services/product-repository";

type ProductDocument = ProductRecord & {
  _id: string;
  images?: ProductWithImages["images"];
  catalogs?: ProductWithImages["catalogs"];
};

const productCollectionName = "products";

const toProductResponse = (doc: WithId<ProductDocument>): ProductWithImages => ({
  id: doc.id ?? doc._id,
  sku: doc.sku ?? null,
  baseProductId: doc.baseProductId ?? null,
  defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
  ean: doc.ean ?? null,
  gtin: doc.gtin ?? null,
  asin: doc.asin ?? null,
  name_en: doc.name_en ?? null,
  name_pl: doc.name_pl ?? null,
  name_de: doc.name_de ?? null,
  description_en: doc.description_en ?? null,
  description_pl: doc.description_pl ?? null,
  description_de: doc.description_de ?? null,
  supplierName: doc.supplierName ?? null,
  supplierLink: doc.supplierLink ?? null,
  priceComment: doc.priceComment ?? null,
  stock: doc.stock ?? null,
  price: doc.price ?? null,
  sizeLength: doc.sizeLength ?? null,
  sizeWidth: doc.sizeWidth ?? null,
  weight: doc.weight ?? null,
  length: doc.length ?? null,
  imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
  images: Array.isArray(doc.images) ? doc.images : [],
  catalogs: Array.isArray(doc.catalogs) ? doc.catalogs : [],
});

const toProductBase = (doc: ProductDocument): ProductRecord => ({
  id: doc.id ?? doc._id,
  sku: doc.sku ?? null,
  baseProductId: doc.baseProductId ?? null,
  defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
  ean: doc.ean ?? null,
  gtin: doc.gtin ?? null,
  asin: doc.asin ?? null,
  name_en: doc.name_en ?? null,
  name_pl: doc.name_pl ?? null,
  name_de: doc.name_de ?? null,
  description_en: doc.description_en ?? null,
  description_pl: doc.description_pl ?? null,
  description_de: doc.description_de ?? null,
  supplierName: doc.supplierName ?? null,
  supplierLink: doc.supplierLink ?? null,
  priceComment: doc.priceComment ?? null,
  stock: doc.stock ?? null,
  price: doc.price ?? null,
  sizeLength: doc.sizeLength ?? null,
  sizeWidth: doc.sizeWidth ?? null,
  weight: doc.weight ?? null,
  length: doc.length ?? null,
  imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const buildSearchFilter = (filters: ProductFilters): Filter<ProductDocument> => {
  const filter: Filter<ProductDocument> = {};

  if (filters.sku) {
    filter.sku = { $regex: filters.sku, $options: "i" };
  }

  if (filters.search) {
    const regex = { $regex: filters.search, $options: "i" };
    filter.$or = [
      { name_en: regex },
      { name_pl: regex },
      { name_de: regex },
      { description_en: regex },
      { description_pl: regex },
      { description_de: regex },
    ];
  }

  if (filters.minPrice || filters.maxPrice) {
    filter.price = {};
    if (filters.minPrice) {
      filter.price.$gte = parseInt(filters.minPrice, 10);
    }
    if (filters.maxPrice) {
      filter.price.$lte = parseInt(filters.maxPrice, 10);
    }
  }

  if (filters.startDate || filters.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      filter.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filter.createdAt.$lte = new Date(filters.endDate);
    }
  }

  if (filters.catalogId) {
    if (filters.catalogId === "unassigned") {
      filter.catalogs = { $size: 0 };
    } else {
      filter.catalogs = { $elemMatch: { catalogId: filters.catalogId } };
    }
  }

  return filter;
};

export const mongoProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    const db = await getMongoDb();
    const page = filters.page ? parseInt(filters.page, 10) : undefined;
    const pageSize = filters.pageSize ? parseInt(filters.pageSize, 10) : undefined;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const limit = pageSize;

    let cursor = db
      .collection<ProductDocument>(productCollectionName)
      .find(buildSearchFilter(filters))
      .sort({ createdAt: -1 });

    if (skip !== undefined) {
      cursor = cursor.skip(skip);
    }
    if (limit !== undefined) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor.toArray();
    return docs.map(toProductResponse);
  },

  async countProducts(filters: ProductFilters) {
    const db = await getMongoDb();
    return db
      .collection<ProductDocument>(productCollectionName)
      .countDocuments(buildSearchFilter(filters));
  },

  async getProductById(id: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? toProductResponse({ ...doc, _id: doc._id }) : null;
  },

  async findProductByBaseId(baseProductId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ baseProductId });
    return doc ? toProductBase(doc) : null;
  },

  async createProduct(data: CreateProductInput) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const document: ProductDocument = {
      _id: id,
      id,
      sku: typeof data.sku === "string" ? data.sku : null,
      baseProductId:
        typeof data.baseProductId === "string" ? data.baseProductId : null,
      defaultPriceGroupId:
        typeof data.defaultPriceGroupId === "string"
          ? data.defaultPriceGroupId
          : null,
      ean: typeof data.ean === "string" ? data.ean : null,
      gtin: typeof data.gtin === "string" ? data.gtin : null,
      asin: typeof data.asin === "string" ? data.asin : null,
      name_en: typeof data.name_en === "string" ? data.name_en : null,
      name_pl: typeof data.name_pl === "string" ? data.name_pl : null,
      name_de: typeof data.name_de === "string" ? data.name_de : null,
      description_en:
        typeof data.description_en === "string" ? data.description_en : null,
      description_pl:
        typeof data.description_pl === "string" ? data.description_pl : null,
      description_de:
        typeof data.description_de === "string" ? data.description_de : null,
      supplierName:
        typeof data.supplierName === "string" ? data.supplierName : null,
      supplierLink:
        typeof data.supplierLink === "string" ? data.supplierLink : null,
      priceComment:
        typeof data.priceComment === "string" ? data.priceComment : null,
      stock: typeof data.stock === "number" ? data.stock : null,
      price: typeof data.price === "number" ? data.price : null,
      sizeLength: typeof data.sizeLength === "number" ? data.sizeLength : null,
      sizeWidth: typeof data.sizeWidth === "number" ? data.sizeWidth : null,
      weight: typeof data.weight === "number" ? data.weight : null,
      length: typeof data.length === "number" ? data.length : null,
      imageLinks: Array.isArray(data.imageLinks) ? data.imageLinks : [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };
    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const db = await getMongoDb();
    const updateDoc: Partial<ProductDocument> = {
      updatedAt: new Date(),
      ...(data.sku !== undefined ? { sku: data.sku ?? null } : null),
      ...(data.baseProductId !== undefined
        ? { baseProductId: data.baseProductId ?? null }
        : null),
      ...(data.defaultPriceGroupId !== undefined
        ? { defaultPriceGroupId: data.defaultPriceGroupId ?? null }
        : null),
      ...(data.ean !== undefined ? { ean: data.ean ?? null } : null),
      ...(data.gtin !== undefined ? { gtin: data.gtin ?? null } : null),
      ...(data.asin !== undefined ? { asin: data.asin ?? null } : null),
      ...(data.name_en !== undefined ? { name_en: data.name_en ?? null } : null),
      ...(data.name_pl !== undefined ? { name_pl: data.name_pl ?? null } : null),
      ...(data.name_de !== undefined ? { name_de: data.name_de ?? null } : null),
      ...(data.description_en !== undefined
        ? { description_en: data.description_en ?? null }
        : null),
      ...(data.description_pl !== undefined
        ? { description_pl: data.description_pl ?? null }
        : null),
      ...(data.description_de !== undefined
        ? { description_de: data.description_de ?? null }
        : null),
      ...(data.supplierName !== undefined
        ? { supplierName: data.supplierName ?? null }
        : null),
      ...(data.supplierLink !== undefined
        ? { supplierLink: data.supplierLink ?? null }
        : null),
      ...(data.priceComment !== undefined
        ? { priceComment: data.priceComment ?? null }
        : null),
      ...(data.stock !== undefined ? { stock: data.stock ?? null } : null),
      ...(data.price !== undefined ? { price: data.price ?? null } : null),
      ...(data.sizeLength !== undefined
        ? { sizeLength: data.sizeLength ?? null }
        : null),
      ...(data.sizeWidth !== undefined
        ? { sizeWidth: data.sizeWidth ?? null }
        : null),
      ...(data.weight !== undefined ? { weight: data.weight ?? null } : null),
      ...(data.length !== undefined ? { length: data.length ?? null } : null),
      ...(data.imageLinks !== undefined
        ? {
            imageLinks: Array.isArray(data.imageLinks)
              ? data.imageLinks
              : [],
          }
        : null),
    };
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: updateDoc },
        { returnDocument: "after" }
      );
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async deleteProduct(id: string) {
    const db = await getMongoDb();
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndDelete({ $or: [{ _id: id }, { id }] });
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async duplicateProduct(id: string, sku: string) {
    const db = await getMongoDb();
    const existing = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ $or: [{ _id: id }, { id }] });
    if (!existing) return null;

    const skuExists = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ sku });
    if (skuExists) {
      throw new Error("A product with this SKU already exists.");
    }

    const now = new Date();
    const duplicatedId = randomUUID();
    const document: ProductDocument = {
      _id: duplicatedId,
      id: duplicatedId,
      sku,
      baseProductId: null,
      defaultPriceGroupId: existing.defaultPriceGroupId ?? null,
      ean: existing.ean ?? null,
      gtin: existing.gtin ?? null,
      asin: existing.asin ?? null,
      name_en: existing.name_en ?? null,
      name_pl: existing.name_pl ?? null,
      name_de: existing.name_de ?? null,
      description_en: existing.description_en ?? null,
      description_pl: existing.description_pl ?? null,
      description_de: existing.description_de ?? null,
      supplierName: existing.supplierName ?? null,
      supplierLink: existing.supplierLink ?? null,
      priceComment: existing.priceComment ?? null,
      stock: existing.stock ?? null,
      price: existing.price ?? null,
      sizeLength: existing.sizeLength ?? null,
      sizeWidth: existing.sizeWidth ?? null,
      weight: existing.weight ?? null,
      length: existing.length ?? null,
      imageLinks: Array.isArray(existing.imageLinks) ? existing.imageLinks : [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };

    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    if (imageFileIds.length === 0) return;
    const db = await getMongoDb();
    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      imageFileIds
    );
    const now = new Date();
    const incoming = imageFiles.map((imageFile) => ({
      productId,
      imageFileId: imageFile.id,
      assignedAt: now,
      imageFile,
    }));
    const product = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ $or: [{ _id: productId }, { id: productId }] });
    const existing = Array.isArray(product?.images) ? product.images : [];
    const merged = [
      ...existing.filter(
        (entry) =>
          !incoming.some(
            (next) => next.imageFileId === entry.imageFileId
          )
      ),
      ...incoming,
    ];
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { images: merged, updatedAt: new Date() } }
      );
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    const db = await getMongoDb();
    if (catalogIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          { $or: [{ _id: productId }, { id: productId }] },
          { $set: { catalogs: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog) => ({
      productId,
      catalogId: catalog.id,
      assignedAt: now,
      catalog,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { catalogs: catalogEntries, updatedAt: new Date() } }
      );
  },

  async removeProductImage(productId: string, imageFileId: string) {
    const db = await getMongoDb();
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        {
          $pull: {
            images: {
              imageFileId,
            },
          },
        }
      );
  },

  async countProductsByImageFileId(imageFileId: string) {
    const db = await getMongoDb();
    return db
      .collection<ProductDocument>(productCollectionName)
      .countDocuments({ "images.imageFileId": imageFileId });
  },
};
