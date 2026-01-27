import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from "@/features/products/types/drafts";
import type { ProductParameterValue } from "@/features/products/types";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { getProductDataProvider } from "@/features/products/services/product-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { ObjectId } from "mongodb";
import prisma from "@/shared/lib/db/prisma";

type DraftProvider = "mongodb" | "prisma";

type MongoDraftDoc = {
  _id: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  weight?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  length?: number | null;
  price?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  stock?: number | null;
  catalogIds?: string[];
  categoryIds?: string[];
  tagIds?: string[];
  parameters?: ProductParameterValue[];
  defaultPriceGroupId?: string | null;
  active?: boolean;
  imageLinks?: string[];
  baseProductId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const getDraftProvider = async (): Promise<DraftProvider> => {
  const provider = await getProductDataProvider();
  return provider;
};

// MongoDB implementation
const listDrafts_Mongo = async (): Promise<ProductDraft[]> => {
  const mongo = await getMongoDb();
  const drafts = await mongo
    .collection<MongoDraftDoc>("product_drafts")
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
      ? draft.parameters
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
  const draft = await mongo.collection<MongoDraftDoc>("product_drafts").findOne({ _id: id });

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
      ? draft.parameters
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

  const draft: MongoDraftDoc = {
    _id: id,
    ...input,
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
    baseProductId: input.baseProductId || null,
    defaultPriceGroupId: input.defaultPriceGroupId || null,
    catalogIds: input.catalogIds || [],
    categoryIds: input.categoryIds || [],
    tagIds: input.tagIds || [],
    parameters: input.parameters || [],
    imageLinks: input.imageLinks || [],
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await mongo.collection<MongoDraftDoc>("product_drafts").insertOne(draft);

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
    catalogIds: draft.catalogIds || [],
    categoryIds: draft.categoryIds || [],
    tagIds: draft.tagIds || [],
    parameters: draft.parameters || [],
    defaultPriceGroupId: input.defaultPriceGroupId || null,
    active: draft.active ?? true,
    imageLinks: draft.imageLinks || [],
    baseProductId: input.baseProductId || null,
    createdAt: now,
    updatedAt: now,
  };
};

const updateDraft_Mongo = async (id: string, input: UpdateProductDraftInput): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const now = new Date();

  const result = await mongo.collection<MongoDraftDoc>("product_drafts").findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...input,
        updatedAt: now,
      } as Partial<MongoDraftDoc>,
    },
    { returnDocument: "after" }
  );

  if (!result) return null;
  
  // Handle different MongoDB driver versions
  const doc = (typeof result === 'object' && 'value' in result) 
    ? (result.value as MongoDraftDoc | null) 
    : (result as unknown as MongoDraftDoc | null);
  
  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name || "",
    description: doc.description || null,
    sku: doc.sku || null,
    ean: doc.ean || null,
    gtin: doc.gtin || null,
    asin: doc.asin || null,
    name_en: doc.name_en || null,
    name_pl: doc.name_pl || null,
    name_de: doc.name_de || null,
    description_en: doc.description_en || null,
    description_pl: doc.description_pl || null,
    description_de: doc.description_de || null,
    weight: doc.weight || null,
    sizeLength: doc.sizeLength || null,
    sizeWidth: doc.sizeWidth || null,
    length: doc.length || null,
    price: doc.price || null,
    supplierName: doc.supplierName || null,
    supplierLink: doc.supplierLink || null,
    priceComment: doc.priceComment || null,
    stock: doc.stock || null,
    catalogIds: Array.isArray(doc.catalogIds) ? doc.catalogIds : [],
    categoryIds: Array.isArray(doc.categoryIds) ? doc.categoryIds : [],
    tagIds: Array.isArray(doc.tagIds) ? doc.tagIds : [],
    parameters: Array.isArray(doc.parameters)
      ? doc.parameters
      : [],
    defaultPriceGroupId: doc.defaultPriceGroupId || null,
    active: doc.active ?? true,
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    baseProductId: doc.baseProductId || null,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  };
};

const deleteDraft_Mongo = async (id: string): Promise<boolean> => {
  const mongo = await getMongoDb();
  const result = await mongo.collection("product_drafts").deleteOne({ _id: new ObjectId(id) });
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
    } as Prisma.ProductDraftCreateInput, // Type assertion needed due to exactOptionalPropertyTypes
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
      data: input as Prisma.ProductDraftUpdateInput, // Type assertion needed due to exactOptionalPropertyTypes
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
