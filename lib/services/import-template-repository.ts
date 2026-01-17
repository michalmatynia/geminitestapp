import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
type ImportTemplateProvider = "mongodb" | "prisma";

const getImportTemplateProvider = async (): Promise<ImportTemplateProvider> => {
  return process.env.MONGODB_URI ? "mongodb" : "prisma";
};

export type ImportTemplateMapping = {
  sourceKey: string;
  targetField: string;
};

export type ImportTemplate = {
  id: string;
  name: string;
  description?: string | null;
  mappings: ImportTemplateMapping[];
  createdAt: string;
  updatedAt: string;
};

const SETTINGS_KEY = "base_import_templates";
const SAMPLE_PRODUCT_KEY = "base_import_sample_product_id";
const SAMPLE_INVENTORY_KEY = "base_import_sample_inventory_id";
const LAST_TEMPLATE_KEY = "base_import_last_template_id";
const ACTIVE_TEMPLATE_KEY = "base_import_active_template_id";
const PARAMETER_CACHE_KEY = "base_import_parameter_cache";

const parseTemplates = (value: string | null): ImportTemplate[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as ImportTemplate[];
  } catch {
    return [];
  }
};

const readTemplatesValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: any; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
      } as any);
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readSampleProductValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: any; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: SAMPLE_PRODUCT_KEY }, { key: SAMPLE_PRODUCT_KEY }],
      } as any);
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SAMPLE_PRODUCT_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readSampleInventoryValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: SAMPLE_INVENTORY_KEY }, { key: SAMPLE_INVENTORY_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SAMPLE_INVENTORY_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readLastTemplateValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: LAST_TEMPLATE_KEY }, { key: LAST_TEMPLATE_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: LAST_TEMPLATE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readActiveTemplateValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: ACTIVE_TEMPLATE_KEY }, { key: ACTIVE_TEMPLATE_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: ACTIVE_TEMPLATE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readParameterCacheValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: PARAMETER_CACHE_KEY }, { key: PARAMETER_CACHE_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: PARAMETER_CACHE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeTemplatesValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateMany(
      { $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }] } as any,
      {
        $set: {
          value,
          key: SETTINGS_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
};

const writeSampleProductValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: SAMPLE_PRODUCT_KEY }, { key: SAMPLE_PRODUCT_KEY }] } as any,
      {
        $set: {
          value,
          key: SAMPLE_PRODUCT_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: SAMPLE_PRODUCT_KEY },
    update: { value },
    create: { key: SAMPLE_PRODUCT_KEY, value },
  });
};

const writeSampleInventoryValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: SAMPLE_INVENTORY_KEY }, { key: SAMPLE_INVENTORY_KEY }] } as any,
      {
        $set: {
          value,
          key: SAMPLE_INVENTORY_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: SAMPLE_INVENTORY_KEY },
    update: { value },
    create: { key: SAMPLE_INVENTORY_KEY, value },
  });
};

const writeLastTemplateValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: LAST_TEMPLATE_KEY }, { key: LAST_TEMPLATE_KEY }] } as any,
      {
        $set: {
          value,
          key: LAST_TEMPLATE_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: LAST_TEMPLATE_KEY },
    update: { value },
    create: { key: LAST_TEMPLATE_KEY, value },
  });
};

const writeActiveTemplateValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: ACTIVE_TEMPLATE_KEY }, { key: ACTIVE_TEMPLATE_KEY }] } as any,
      {
        $set: {
          value,
          key: ACTIVE_TEMPLATE_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: ACTIVE_TEMPLATE_KEY },
    update: { value },
    create: { key: ACTIVE_TEMPLATE_KEY, value },
  });
};

const writeParameterCacheValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: PARAMETER_CACHE_KEY }, { key: PARAMETER_CACHE_KEY }] } as any,
      {
        $set: {
          value,
          key: PARAMETER_CACHE_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: PARAMETER_CACHE_KEY },
    update: { value },
    create: { key: PARAMETER_CACHE_KEY, value },
  });
};
export const listImportTemplates = async (): Promise<ImportTemplate[]> => {
  const raw = await readTemplatesValue();
  return parseTemplates(raw);
};

export const getImportSampleProductId = async (): Promise<string | null> => {
  return readSampleProductValue();
};

export const setImportSampleProductId = async (value: string) => {
  await writeSampleProductValue(value);
};

export const getImportSampleInventoryId = async (): Promise<string | null> => {
  return readSampleInventoryValue();
};

export const setImportSampleInventoryId = async (value: string) => {
  await writeSampleInventoryValue(value);
};

export const getImportLastTemplateId = async (): Promise<string | null> => {
  const value = await readLastTemplateValue();
  return value ? value : null;
};

export const setImportLastTemplateId = async (value: string | null) => {
  await writeLastTemplateValue(value?.trim() ? value.trim() : "");
};

export const getImportActiveTemplateId = async (): Promise<string | null> => {
  const value = await readActiveTemplateValue();
  return value ? value : null;
};

export const setImportActiveTemplateId = async (value: string | null) => {
  await writeActiveTemplateValue(value?.trim() ? value.trim() : "");
};

export type ImportParameterCache = {
  inventoryId: string | null;
  productId: string | null;
  keys: string[];
  values: Record<string, string>;
  updatedAt: string;
};

export const getImportParameterCache = async (): Promise<ImportParameterCache | null> => {
  const raw = await readParameterCacheValue();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ImportParameterCache;
    if (!parsed || !Array.isArray(parsed.keys) || typeof parsed.values !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setImportParameterCache = async (input: {
  inventoryId: string | null;
  productId: string | null;
  keys: string[];
  values: Record<string, string>;
}) => {
  const payload: ImportParameterCache = {
    inventoryId: input.inventoryId,
    productId: input.productId,
    keys: input.keys,
    values: input.values,
    updatedAt: new Date().toISOString(),
  };
  await writeParameterCacheValue(JSON.stringify(payload));
};

export const getImportTemplate = async (
  id: string
): Promise<ImportTemplate | null> => {
  const templates = await listImportTemplates();
  return templates.find((template) => template.id === id) ?? null;
};

export const createImportTemplate = async (input: {
  name: string;
  description?: string | null;
  mappings?: ImportTemplateMapping[];
}): Promise<ImportTemplate> => {
  const templates = await listImportTemplates();
  const now = new Date().toISOString();
  const template: ImportTemplate = {
    id: randomUUID(),
    name: input.name,
    description: input.description ?? null,
    mappings: input.mappings ?? [],
    createdAt: now,
    updatedAt: now,
  };
  templates.push(template);
  await writeTemplatesValue(JSON.stringify(templates));
  return template;
};

export const updateImportTemplate = async (
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    mappings: ImportTemplateMapping[];
  }>
): Promise<ImportTemplate | null> => {
  const templates = await listImportTemplates();
  const index = templates.findIndex((template) => template.id === id);
  if (index === -1) return null;
  const updated: ImportTemplate = {
    ...templates[index],
    ...input,
    mappings: input.mappings ?? templates[index].mappings,
    updatedAt: new Date().toISOString(),
  };
  templates[index] = updated;
  await writeTemplatesValue(JSON.stringify(templates));
  return updated;
};

export const deleteImportTemplate = async (id: string): Promise<boolean> => {
  const templates = await listImportTemplates();
  const next = templates.filter((template) => template.id !== id);
  if (next.length === templates.length) return false;
  await writeTemplatesValue(JSON.stringify(next));
  return true;
};
