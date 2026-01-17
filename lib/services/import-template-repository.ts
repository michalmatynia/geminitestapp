import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";

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
  const provider = await getProductDataProvider();
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
  const provider = await getProductDataProvider();
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

const writeTemplatesValue = async (value: string) => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { _id: SETTINGS_KEY } as any,
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
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection("settings").updateOne(
      { _id: SAMPLE_PRODUCT_KEY } as any,
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
