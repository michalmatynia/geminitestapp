import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";

type ExportTemplateProvider = "mongodb" | "prisma";

const getExportTemplateProvider = async (): Promise<ExportTemplateProvider> => {
  const provider = await getProductDataProvider();
  console.log(`[ExportTemplateRepository] Provider: ${provider}`);
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

const SETTINGS_KEY = "base_export_templates";
const ACTIVE_TEMPLATE_KEY = "base_export_active_template_id";
const DEFAULT_INVENTORY_KEY = "base_export_default_inventory_id";
const STOCK_FALLBACK_KEY = "base_export_stock_fallback_enabled";
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
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      console.warn("[ExportTemplateRepository] Parsed value is not an array:", parsed);
      return [];
    }
    return parsed
      .filter(Boolean)
      .map((template: Template) => ({
        ...template,
        mappings: stripBasehostMappings(Array.isArray(template.mappings) ? template.mappings : []),
      })) as Template[];
  } catch (error) {
    console.error("[ExportTemplateRepository] Failed to parse templates:", error);
    return [];
  }
};

const readTemplatesValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: any; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
      } as any);
    const val = typeof doc?.value === "string" ? doc.value : null;
    console.log(
      `[ExportTemplateRepository] Read templates (Mongo):`,
      val ? `${val.length} chars` : "null"
    );
    return val;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true },
  });
  console.log(
    `[ExportTemplateRepository] Read templates (Prisma):`,
    setting?.value ? `${setting.value.length} chars` : "null"
  );
  return setting?.value ?? null;
};

const readActiveTemplateValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
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

const readDefaultInventoryValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: DEFAULT_INVENTORY_KEY }, { key: DEFAULT_INVENTORY_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: DEFAULT_INVENTORY_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readStockFallbackValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [{ _id: STOCK_FALLBACK_KEY }, { key: STOCK_FALLBACK_KEY }],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: STOCK_FALLBACK_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeTemplatesValue = async (value: string) => {
  const provider = await getExportTemplateProvider();
  console.log(`[ExportTemplateRepository] Writing templates... Length: ${value.length}`);
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
  console.log(`[ExportTemplateRepository] Wrote templates (Prisma).`);
};

const writeActiveTemplateValue = async (value: string) => {
  const provider = await getExportTemplateProvider();
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

const writeDefaultInventoryValue = async (value: string) => {
  const provider = await getExportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: DEFAULT_INVENTORY_KEY }, { key: DEFAULT_INVENTORY_KEY }] } as any,
      {
        $set: {
          value,
          key: DEFAULT_INVENTORY_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: DEFAULT_INVENTORY_KEY },
    update: { value },
    create: { key: DEFAULT_INVENTORY_KEY, value },
  });
};

const writeStockFallbackValue = async (value: string) => {
  const provider = await getExportTemplateProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { $or: [{ _id: STOCK_FALLBACK_KEY }, { key: STOCK_FALLBACK_KEY }] } as any,
      {
        $set: {
          value,
          key: STOCK_FALLBACK_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: STOCK_FALLBACK_KEY },
    update: { value },
    create: { key: STOCK_FALLBACK_KEY, value },
  });
};

export const listExportTemplates = async (): Promise<Template[]> => {
  const raw = await readTemplatesValue();
  return parseTemplates(raw);
};

export const getExportTemplate = async (
  id: string
): Promise<Template | null> => {
  const templates = await listExportTemplates();
  return templates.find((template) => template.id === id) ?? null;
};

export const createExportTemplate = async (input: {
  name: string;
  description?: string | null;
  mappings?: TemplateMapping[];
}): Promise<Template> => {
  const templates = await listExportTemplates();
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

export const updateExportTemplate = async (
  id: string,
  input: Partial<{
    name: string | undefined;
    description: string | null | undefined;
    mappings: TemplateMapping[] | undefined;
  }>
): Promise<Template | null> => {
  const templates = await listExportTemplates();
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

export const deleteExportTemplate = async (id: string): Promise<boolean> => {
  const templates = await listExportTemplates();
  const next = templates.filter((template) => template.id !== id);
  if (next.length === templates.length) return false;
  await writeTemplatesValue(JSON.stringify(next));
  return true;
};

export const getExportActiveTemplateId = async (): Promise<string | null> => {
  const value = await readActiveTemplateValue();
  return value ? value : null;
};

export const setExportActiveTemplateId = async (value: string | null) => {
  await writeActiveTemplateValue(value?.trim() ? value.trim() : "");
};

export const getExportDefaultInventoryId = async (): Promise<string | null> => {
  const value = await readDefaultInventoryValue();
  return value ? value : null;
};

export const setExportDefaultInventoryId = async (value: string | null) => {
  await writeDefaultInventoryValue(value?.trim() ? value.trim() : "");
};

export const getExportStockFallbackEnabled = async (): Promise<boolean> => {
  const value = await readStockFallbackValue();
  return value?.trim().toLowerCase() === "true";
};

export const setExportStockFallbackEnabled = async (enabled: boolean) => {
  await writeStockFallbackValue(enabled ? "true" : "false");
};
