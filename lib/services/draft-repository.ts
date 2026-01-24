import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from "@/types/drafts";
import type { ProductParameterValue } from "@/types/products";
import { randomUUID } from "crypto";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import prisma from "@/lib/prisma";

type DraftProvider = "mongodb" | "prisma";

const getDraftProvider = async (): Promise<DraftProvider> => {
  const provider = await getProductDataProvider();
  return provider;
};

// MongoDB implementation
const listDrafts_Mongo = async (): Promise<ProductDraft[]> => {
  const mongo = await getMongoDb();
  const drafts = await mongo
    .collection("product_drafts")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return drafts.map((draft) => ({
    id: String(draft._id),
    name: draft.name || "",
    description: draft.description || null,
    sku: draft.sku || null,
    ean: draft.ean || null,
    gtin: draft.gtin || null,
    asin: draft.asin || null,
    name_en: draft.name_en || null,
    name_pl: draft.name_pl || null,
    name_de: draft.name_de || null,
    description_en: draft.description_en || null,
    description_pl: draft.description_pl || null,
    description_de: draft.description_de || null,
    weight: draft.weight || null,
    sizeLength: draft.sizeLength || null,
    sizeWidth: draft.sizeWidth || null,
    length: draft.length || null,
    price: draft.price || null,
    supplierName: draft.supplierName || null,
    supplierLink: draft.supplierLink || null,
    priceComment: draft.priceComment || null,
    stock: draft.stock || null,
    catalogIds: Array.isArray(draft.catalogIds) ? draft.catalogIds : [],
    categoryIds: Array.isArray(draft.categoryIds) ? draft.categoryIds : [],
    tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : [],
    parameters: Array.isArray(draft.parameters)
      ? (draft.parameters as ProductParameterValue[])
      : [],
    defaultPriceGroupId: draft.defaultPriceGroupId || null,
    active: draft.active ?? true,
    imageLinks: Array.isArray(draft.imageLinks) ? draft.imageLinks : [],
    baseProductId: draft.baseProductId || null,
    createdAt: draft.createdAt || new Date(),
    updatedAt: draft.updatedAt || new Date(),
  }));
};

const getDraft_Mongo = async (id: string): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const draft = await mongo.collection("product_drafts").findOne({ _id: id } as any);

  if (!draft) return null;

  return {
    id: String(draft._id),
    name: draft.name || "",
    description: draft.description || null,
    sku: draft.sku || null,
    ean: draft.ean || null,
    gtin: draft.gtin || null,
    asin: draft.asin || null,
    name_en: draft.name_en || null,
    name_pl: draft.name_pl || null,
    name_de: draft.name_de || null,
    description_en: draft.description_en || null,
    description_pl: draft.description_pl || null,
    description_de: draft.description_de || null,
    weight: draft.weight || null,
    sizeLength: draft.sizeLength || null,
    sizeWidth: draft.sizeWidth || null,
    length: draft.length || null,
    price: draft.price || null,
    supplierName: draft.supplierName || null,
    supplierLink: draft.supplierLink || null,
    priceComment: draft.priceComment || null,
    stock: draft.stock || null,
    catalogIds: Array.isArray(draft.catalogIds) ? draft.catalogIds : [],
    categoryIds: Array.isArray(draft.categoryIds) ? draft.categoryIds : [],
    tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : [],
    parameters: Array.isArray(draft.parameters)
      ? (draft.parameters as ProductParameterValue[])
      : [],
    defaultPriceGroupId: draft.defaultPriceGroupId || null,
    active: draft.active ?? true,
    imageLinks: Array.isArray(draft.imageLinks) ? draft.imageLinks : [],
    baseProductId: draft.baseProductId || null,
    createdAt: draft.createdAt || new Date(),
    updatedAt: draft.updatedAt || new Date(),
  };
};

const createDraft_Mongo = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const id = randomUUID();

  const draft = {
    _id: id,
    ...input,
    catalogIds: input.catalogIds || [],
    categoryIds: input.categoryIds || [],
    tagIds: input.tagIds || [],
    parameters: input.parameters || [],
    imageLinks: input.imageLinks || [],
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await mongo.collection("product_drafts").insertOne(draft as any);

  return {
    id,
    name: input.name,
    description: input.description || null,
    sku: input.sku || null,
    ean: input.ean || null,
    gtin: input.gtin || null,
    asin: input.asin || null,
    name_en: input.name_en || null,
    name_pl: input.name_pl || null,
    name_de: input.name_de || null,
    description_en: input.description_en || null,
    description_pl: input.description_pl || null,
    description_de: input.description_de || null,
    weight: input.weight || null,
    sizeLength: input.sizeLength || null,
    sizeWidth: input.sizeWidth || null,
    length: input.length || null,
    price: input.price || null,
    supplierName: input.supplierName || null,
    supplierLink: input.supplierLink || null,
    priceComment: input.priceComment || null,
    stock: input.stock || null,
    catalogIds: draft.catalogIds,
    categoryIds: draft.categoryIds,
    tagIds: draft.tagIds,
    parameters: draft.parameters,
    defaultPriceGroupId: input.defaultPriceGroupId || null,
    active: draft.active,
    imageLinks: draft.imageLinks,
    baseProductId: input.baseProductId || null,
    createdAt: now,
    updatedAt: now,
  };
};

const updateDraft_Mongo = async (id: string, input: UpdateProductDraftInput): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const now = new Date();

  const result = await mongo.collection("product_drafts").findOneAndUpdate(
    { _id: id } as any,
    {
      $set: {
        ...input,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!result) return null;

  return {
    id: String(result._id),
    name: result.name || "",
    description: result.description || null,
    sku: result.sku || null,
    ean: result.ean || null,
    gtin: result.gtin || null,
    asin: result.asin || null,
    name_en: result.name_en || null,
    name_pl: result.name_pl || null,
    name_de: result.name_de || null,
    description_en: result.description_en || null,
    description_pl: result.description_pl || null,
    description_de: result.description_de || null,
    weight: result.weight || null,
    sizeLength: result.sizeLength || null,
    sizeWidth: result.sizeWidth || null,
    length: result.length || null,
    price: result.price || null,
    supplierName: result.supplierName || null,
    supplierLink: result.supplierLink || null,
    priceComment: result.priceComment || null,
    stock: result.stock || null,
    catalogIds: Array.isArray(result.catalogIds) ? result.catalogIds : [],
    categoryIds: Array.isArray(result.categoryIds) ? result.categoryIds : [],
    tagIds: Array.isArray(result.tagIds) ? result.tagIds : [],
    parameters: Array.isArray(result.parameters)
      ? (result.parameters as ProductParameterValue[])
      : [],
    defaultPriceGroupId: result.defaultPriceGroupId || null,
    active: result.active ?? true,
    imageLinks: Array.isArray(result.imageLinks) ? result.imageLinks : [],
    baseProductId: result.baseProductId || null,
    createdAt: result.createdAt || now,
    updatedAt: now,
  };
};

const deleteDraft_Mongo = async (id: string): Promise<boolean> => {
  const mongo = await getMongoDb();
  const result = await mongo.collection("product_drafts").deleteOne({ _id: id } as any);
  return result.deletedCount > 0;
};

// Prisma implementation
const listDrafts_Prisma = async (): Promise<ProductDraft[]> => {
  const drafts = await prisma.productDraft.findMany({
    orderBy: { createdAt: "desc" },
  });

  return drafts.map((draft) => ({
    ...draft,
    catalogIds: draft.catalogIds as string[],
    categoryIds: draft.categoryIds as string[],
    tagIds: draft.tagIds as string[],
    parameters: draft.parameters as ProductParameterValue[],
    imageLinks: draft.imageLinks as string[],
  }));
};

const getDraft_Prisma = async (id: string): Promise<ProductDraft | null> => {
  const draft = await prisma.productDraft.findUnique({
    where: { id },
  });

  if (!draft) return null;

  return {
    ...draft,
    catalogIds: draft.catalogIds as string[],
    categoryIds: draft.categoryIds as string[],
    tagIds: draft.tagIds as string[],
    parameters: draft.parameters as ProductParameterValue[],
    imageLinks: draft.imageLinks as string[],
  };
};

const createDraft_Prisma = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  const draft = await prisma.productDraft.create({
    data: {
      name: input.name,
      description: input.description,
      sku: input.sku,
      ean: input.ean,
      gtin: input.gtin,
      asin: input.asin,
      name_en: input.name_en,
      name_pl: input.name_pl,
      name_de: input.name_de,
      description_en: input.description_en,
      description_pl: input.description_pl,
      description_de: input.description_de,
      weight: input.weight,
      sizeLength: input.sizeLength,
      sizeWidth: input.sizeWidth,
      length: input.length,
      price: input.price,
      supplierName: input.supplierName,
      supplierLink: input.supplierLink,
      priceComment: input.priceComment,
      stock: input.stock,
      catalogIds: input.catalogIds || [],
      categoryIds: input.categoryIds || [],
      tagIds: input.tagIds || [],
      parameters: input.parameters || [],
      defaultPriceGroupId: input.defaultPriceGroupId,
      active: input.active ?? true,
      imageLinks: input.imageLinks || [],
      baseProductId: input.baseProductId,
    } as any, // Type assertion needed due to exactOptionalPropertyTypes
  });

  return {
    ...draft,
    catalogIds: draft.catalogIds as string[],
    categoryIds: draft.categoryIds as string[],
    tagIds: draft.tagIds as string[],
    parameters: draft.parameters as ProductParameterValue[],
    imageLinks: draft.imageLinks as string[],
  };
};

const updateDraft_Prisma = async (id: string, input: UpdateProductDraftInput): Promise<ProductDraft | null> => {
  try {
    const draft = await prisma.productDraft.update({
      where: { id },
      data: input as any, // Type assertion needed due to exactOptionalPropertyTypes
    });

    return {
      ...draft,
      catalogIds: draft.catalogIds as string[],
      categoryIds: draft.categoryIds as string[],
      tagIds: draft.tagIds as string[],
      parameters: draft.parameters as ProductParameterValue[],
      imageLinks: draft.imageLinks as string[],
    };
  } catch {
    return null;
  }
};

const deleteDraft_Prisma = async (id: string): Promise<boolean> => {
  try {
    await prisma.productDraft.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
};

// Public API
export const listDrafts = async (): Promise<ProductDraft[]> => {
  const provider = await getDraftProvider();
  return provider === "mongodb" ? listDrafts_Mongo() : listDrafts_Prisma();
};

export const getDraft = async (id: string): Promise<ProductDraft | null> => {
  const provider = await getDraftProvider();
  return provider === "mongodb" ? getDraft_Mongo(id) : getDraft_Prisma(id);
};

export const createDraft = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  const provider = await getDraftProvider();
  return provider === "mongodb" ? createDraft_Mongo(input) : createDraft_Prisma(input);
};

export const updateDraft = async (id: string, input: UpdateProductDraftInput): Promise<ProductDraft | null> => {
  const provider = await getDraftProvider();
  return provider === "mongodb" ? updateDraft_Mongo(id, input) : updateDraft_Prisma(id, input);
};

export const deleteDraft = async (id: string): Promise<boolean> => {
  const provider = await getDraftProvider();
  return provider === "mongodb" ? deleteDraft_Mongo(id) : deleteDraft_Prisma(id);
};
