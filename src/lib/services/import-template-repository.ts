import { randomUUID } from "crypto";
import type { Document, Filter } from "mongodb";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/features/products/services/product-provider";

type ImportTemplateProvider = "mongodb" | "prisma";

const getImportTemplateProvider = async (): Promise<ImportTemplateProvider> => {
  const provider = await getProductDataProvider();
  console.log(`[ImportTemplateRepository] Provider: ${provider}`);
  return provider;
};

export type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

export type Template = {
  id: string;
  name: string;
  description?: string | null;
  mappings: TemplateMapping[];
  createdAt: string;
  updatedAt: string;
};

// Legacy aliases for backwards compatibility
export type ImportTemplateMapping = TemplateMapping;
export type ImportTemplate = Template;

const SETTINGS_KEY = "base_import_templates";
const SAMPLE_PRODUCT_KEY = "base_import_sample_product_id";
const SAMPLE_INVENTORY_KEY = "base_import_sample_inventory_id";
const LAST_TEMPLATE_KEY = "base_import_last_template_id";
const ACTIVE_TEMPLATE_KEY = "base_import_active_template_id";
const PARAMETER_CACHE_KEY = "base_import_parameter_cache";
const EXPORT_WAREHOUSE_KEY = "base_export_warehouse_id";
const EXPORT_WAREHOUSE_MAP_KEY = "base_export_warehouse_by_inventory";
const EXPORT_WAREHOUSE_SKIP_VALUE = "__skip__";
const BASEHOST_MAPPING_KEYS = new Set(["images_basehost_all", "image_basehost_all"]);

const stripBasehostMappings = (mappings: TemplateMapping[]) =>
  mappings.filter((mapping) => {
    const sourceKey = mapping.sourceKey?.trim().toLowerCase();
    const targetField = mapping.targetField?.trim().toLowerCase();
    return !BASEHOST_MAPPING_KEYS.has(sourceKey) && !BASEHOST_MAPPING_KEYS.has(targetField);
  });

const parseTemplates = (value: string | null): Template[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("[ImportTemplateRepository] Parsed value is not an array:", parsed);
      return [];
    }
    return parsed
      .filter(Boolean)
      .map((template: Template) => ({
        ...template,
        mappings: stripBasehostMappings(Array.isArray(template.mappings) ? template.mappings : []),
      })) as Template[];
  } catch (error) {
    console.error("[ImportTemplateRepository] Failed to parse templates:", error);
    return [];
  }
};

const parseExportWarehouseMap = (value: string | null): Record<string, string> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(
      ([key, raw]) => {
        const trimmedKey = key.trim();
        if (!trimmedKey) return;
        const normalized =
          typeof raw === "string"
            ? raw.trim()
            : (typeof raw === "number" || typeof raw === "boolean")
              ? String(raw).trim()
              : "";
        if (normalized || normalized === EXPORT_WAREHOUSE_SKIP_VALUE) {
          result[trimmedKey] = normalized;
        }
      }
    );
    return result;
  } catch {
    return {};
  }
};

const readTemplatesValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection("settings")
      .findOne({
        $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
      } as Filter<Document>);
    const val = doc && typeof doc.value === "string" ? doc.value : null;
    console.log(`[ImportTemplateRepository] Read templates (Mongo):`, val ? `${val.length} chars` : "null");
    return val;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true },
  });
  console.log(`[ImportTemplateRepository] Read templates (Prisma):`, setting?.value ? `${setting.value.length} chars` : "null");
  return setting?.value ?? null;
};

const readSampleProductValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection("settings")
      .findOne({
        $or: [{ _id: SAMPLE_PRODUCT_KEY }, { key: SAMPLE_PRODUCT_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
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
      .collection("settings")
      .findOne({
        $or: [{ _id: SAMPLE_INVENTORY_KEY }, { key: SAMPLE_INVENTORY_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
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
      .collection("settings")
      .findOne({
        $or: [{ _id: LAST_TEMPLATE_KEY }, { key: LAST_TEMPLATE_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
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
      .collection("settings")
      .findOne({
        $or: [{ _id: ACTIVE_TEMPLATE_KEY }, { key: ACTIVE_TEMPLATE_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
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
      .collection("settings")
      .findOne({
        $or: [{ _id: PARAMETER_CACHE_KEY }, { key: PARAMETER_CACHE_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: PARAMETER_CACHE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readExportWarehouseValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection("settings")
      .findOne({
        $or: [{ _id: EXPORT_WAREHOUSE_KEY }, { key: EXPORT_WAREHOUSE_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: EXPORT_WAREHOUSE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readExportWarehouseMapValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection("settings")
      .findOne({
        $or: [{ _id: EXPORT_WAREHOUSE_MAP_KEY }, { key: EXPORT_WAREHOUSE_MAP_KEY }],
      } as Filter<Document>);
    return doc && typeof doc.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: EXPORT_WAREHOUSE_MAP_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeTemplatesValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  console.log(`[ImportTemplateRepository] Writing templates... Length: ${value.length}`);
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateMany(
      { $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }] } as Filter<Document>,
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
  console.log(`[ImportTemplateRepository] Wrote templates (Prisma).`);
};

const writeSampleProductValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: SAMPLE_PRODUCT_KEY }, { key: SAMPLE_PRODUCT_KEY }] } as Filter<Document>,
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
      { $or: [{ _id: SAMPLE_INVENTORY_KEY }, { key: SAMPLE_INVENTORY_KEY }] } as Filter<Document>,
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

const writeExportWarehouseValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: EXPORT_WAREHOUSE_KEY }, { key: EXPORT_WAREHOUSE_KEY }] } as Filter<Document>,
      {
        $set: {
          value,
          key: EXPORT_WAREHOUSE_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: EXPORT_WAREHOUSE_KEY },
    update: { value },
    create: { key: EXPORT_WAREHOUSE_KEY, value },
  });
};

const writeExportWarehouseMapValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: EXPORT_WAREHOUSE_MAP_KEY }, { key: EXPORT_WAREHOUSE_MAP_KEY }] } as Filter<Document>,
      {
        $set: {
          value,
          key: EXPORT_WAREHOUSE_MAP_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: EXPORT_WAREHOUSE_MAP_KEY },
    update: { value },
    create: { key: EXPORT_WAREHOUSE_MAP_KEY, value },
  });
};

const writeLastTemplateValue = async (value: string) => {
  const provider = await getImportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: LAST_TEMPLATE_KEY }, { key: LAST_TEMPLATE_KEY }] } as Filter<Document>,
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
      { $or: [{ _id: ACTIVE_TEMPLATE_KEY }, { key: ACTIVE_TEMPLATE_KEY }] } as Filter<Document>,
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
      { $or: [{ _id: PARAMETER_CACHE_KEY }, { key: PARAMETER_CACHE_KEY }] } as Filter<Document>,
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
export const listImportTemplates = async (): Promise<Template[]> => {
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

export const getExportWarehouseId = async (
  inventoryId?: string | null
): Promise<string | null> => {
  const normalizedInventory = inventoryId?.trim() ?? "";
  if (normalizedInventory) {
    const rawMap = await readExportWarehouseMapValue();
    const map = parseExportWarehouseMap(rawMap);
    const mapped = map[normalizedInventory];
    if (mapped === EXPORT_WAREHOUSE_SKIP_VALUE) {
      return null;
    }
    if (mapped) return mapped;
    const fallback = await readExportWarehouseValue();
    if (fallback) {
      map[normalizedInventory] = fallback;
      await writeExportWarehouseMapValue(JSON.stringify(map));
      return fallback;
    }
    return null;
  }
  const value = await readExportWarehouseValue();
  return value ? value : null;
};

export const setExportWarehouseId = async (
  value: string | null,
  inventoryId?: string | null
) => {
  const normalizedInventory = inventoryId?.trim() ?? "";
  const normalizedValue = value?.trim() ?? "";
  if (normalizedInventory) {
    const rawMap = await readExportWarehouseMapValue();
    const map = parseExportWarehouseMap(rawMap);
    map[normalizedInventory] = normalizedValue || EXPORT_WAREHOUSE_SKIP_VALUE;
    await writeExportWarehouseMapValue(JSON.stringify(map));
    return;
  }
  await writeExportWarehouseValue(normalizedValue);
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
  mappings?: TemplateMapping[];
}): Promise<ImportTemplate> => {
  const templates = await listImportTemplates();
  const now = new Date().toISOString();
  const template: Template = {
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
    name: string | undefined;
    description: string | null | undefined;
    mappings: TemplateMapping[] | undefined;
  }>
): Promise<ImportTemplate | null> => {
  const templates = await listImportTemplates();
  const index = templates.findIndex((template) => template.id === id);
  if (index === -1) return null;
  const existing = templates[index]!;
  const updated = {
    id: existing.id,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    mappings: input.mappings ?? existing.mappings,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  } as Template;
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

// Modern aliases without "Import" prefix (for dual-purpose import/export templates)
export const listTemplates = listImportTemplates;
export const getTemplate = getImportTemplate;
export const createTemplate = createImportTemplate;
export const updateTemplate = updateImportTemplate;
export const deleteTemplate = deleteImportTemplate;
