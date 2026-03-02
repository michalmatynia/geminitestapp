import 'server-only';

import { randomUUID } from 'crypto';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import type {
  IntegrationTemplate as Template,
  IntegrationTemplateMapping as TemplateMapping,
} from '@/shared/contracts/integrations';
import {
  normalizeBaseImportParameterImportSettings,
  defaultBaseImportParameterImportSettings,
} from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Document, Filter } from 'mongodb';

type ImportTemplateProvider = 'mongodb' | 'prisma';
const LOG_SOURCE = 'import-template-repository';

const getImportTemplateProvider = async (): Promise<ImportTemplateProvider> => {
  const provider = await getProductDataProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Provider: ${provider}`,
    context: { provider },
  });
  return provider as ImportTemplateProvider;
};

const SETTINGS_KEY = 'base_import_templates';
const SAMPLE_PRODUCT_KEY = 'base_import_sample_product_id';
const SAMPLE_INVENTORY_KEY = 'base_import_sample_inventory_id';
const LAST_TEMPLATE_KEY = 'base_import_last_template_id';
const ACTIVE_TEMPLATE_KEY = 'base_import_active_template_id';
const PARAMETER_CACHE_KEY = 'base_import_parameter_cache';
const EXPORT_WAREHOUSE_KEY = 'base_export_warehouse_id';
const EXPORT_WAREHOUSE_MAP_KEY = 'base_export_warehouse_by_inventory';
const EXPORT_WAREHOUSE_SKIP_VALUE = '__skip__';
const BASEHOST_MAPPING_KEYS = new Set(['images_basehost_all', 'image_basehost_all']);
const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';
const LEGACY_ACTIVE_TEMPLATE_SCOPE_KEY = '__global__';

type ActiveTemplateScopeInput = {
  connectionId?: string | null;
  inventoryId?: string | null;
};

type ScopedActiveTemplateMap = {
  defaultTemplateId: string | null;
  byScope: Record<string, string>;
};

const stripBasehostMappings = (mappings: TemplateMapping[]): TemplateMapping[] =>
  mappings.filter((mapping: TemplateMapping) => {
    const sourceKey = mapping.sourceKey?.trim().toLowerCase();
    const targetField = mapping.targetField?.trim().toLowerCase();
    return !BASEHOST_MAPPING_KEYS.has(sourceKey) && !BASEHOST_MAPPING_KEYS.has(targetField);
  });

const parseTemplates = async (value: string | null): Promise<Template[]> => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      void ErrorSystem.logWarning('[ImportTemplateRepository] Parsed value is not an array', {
        service: 'import-template-repository',
        parsed,
      });
      return [];
    }
    return parsed.filter(Boolean).map((template: Template) => ({
      ...template,
      mappings: stripBasehostMappings(Array.isArray(template.mappings) ? template.mappings : []),
      parameterImport: normalizeBaseImportParameterImportSettings(template.parameterImport),
    })) as Template[];
  } catch (error: unknown) {
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ImportTemplateRepository] Failed to parse templates',
        error,
        source: 'import-template-repository',
        context: { action: 'parseTemplates' },
      });
    } catch (logError) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[ImportTemplateRepository] Failed to parse templates (and logging failed):',
        logError,
        { originalError: error }
      );
    }
    return [];
  }
};

const parseExportWarehouseMap = (value: string | null): Record<string, string> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, raw]: [string, unknown]) => {
      const trimmedKey = key.trim();
      if (!trimmedKey) return;
      const normalized =
        typeof raw === 'string'
          ? raw.trim()
          : typeof raw === 'number' || typeof raw === 'boolean'
            ? String(raw).trim()
            : '';
      if (normalized || normalized === EXPORT_WAREHOUSE_SKIP_VALUE) {
        result[trimmedKey] = normalized;
      }
    });
    return result;
  } catch {
    return {};
  }
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildActiveTemplateScopeKey = (scope?: ActiveTemplateScopeInput): string | null => {
  const connectionId = normalizeOptionalId(scope?.connectionId);
  const inventoryId = normalizeOptionalId(scope?.inventoryId);
  if (!connectionId || !inventoryId) return null;
  return `${connectionId}${ACTIVE_TEMPLATE_SCOPE_SEPARATOR}${inventoryId}`;
};

const parseActiveTemplateMap = (raw: string | null): ScopedActiveTemplateMap => {
  if (!raw) {
    return { defaultTemplateId: null, byScope: {} };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { defaultTemplateId: null, byScope: {} };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { defaultTemplateId: trimmed, byScope: {} };
    }
    const record = parsed as Record<string, unknown>;
    const byScopeRaw = record['byScope'];
    const byScope: Record<string, string> = {};
    if (byScopeRaw && typeof byScopeRaw === 'object' && !Array.isArray(byScopeRaw)) {
      Object.entries(byScopeRaw as Record<string, unknown>).forEach(
        ([scopeKey, scopeValue]: [string, unknown]) => {
          const normalizedScopeKey = scopeKey.trim();
          const normalizedTemplateId = normalizeOptionalId(scopeValue);
          if (!normalizedScopeKey || !normalizedTemplateId) return;
          byScope[normalizedScopeKey] = normalizedTemplateId;
        }
      );
    } else {
      Object.entries(record).forEach(([key, value]: [string, unknown]) => {
        const normalizedKey = key.trim();
        const normalizedValue = normalizeOptionalId(value);
        if (!normalizedKey || !normalizedValue) return;
        if (
          normalizedKey.includes(ACTIVE_TEMPLATE_SCOPE_SEPARATOR) ||
          normalizedKey === LEGACY_ACTIVE_TEMPLATE_SCOPE_KEY
        ) {
          byScope[normalizedKey] = normalizedValue;
        }
      });
    }

    const defaultTemplateId =
      normalizeOptionalId(record['defaultTemplateId']) ??
      normalizeOptionalId(record['templateId']) ??
      null;

    return { defaultTemplateId, byScope };
  } catch {
    return { defaultTemplateId: trimmed, byScope: {} };
  }
};

const stringifyActiveTemplateMap = (map: ScopedActiveTemplateMap): string => {
  const defaultTemplateId = normalizeOptionalId(map.defaultTemplateId);
  const byScopeEntries = Object.entries(map.byScope).reduce(
    (acc: Record<string, string>, [scopeKey, templateId]: [string, string]) => {
      const normalizedScopeKey = scopeKey.trim();
      const normalizedTemplateId = normalizeOptionalId(templateId);
      if (!normalizedScopeKey || !normalizedTemplateId) return acc;
      acc[normalizedScopeKey] = normalizedTemplateId;
      return acc;
    },
    {}
  );

  if (Object.keys(byScopeEntries).length === 0) {
    return defaultTemplateId ?? '';
  }

  return JSON.stringify({
    defaultTemplateId,
    byScope: byScopeEntries,
  });
};

const readTemplatesValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
    } as Filter<Document>);
    const val = doc && typeof doc['value'] === 'string' ? doc['value'] : null;
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Read templates (Mongo)',
      context: { length: val ? val.length : 0 },
    });
    return val;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true },
  });
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Read templates (Prisma)',
    context: { length: setting?.value ? setting.value.length : 0 },
  });
  return setting?.value ?? null;
};

const readSampleProductValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: SAMPLE_PRODUCT_KEY }, { key: SAMPLE_PRODUCT_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SAMPLE_PRODUCT_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readSampleInventoryValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: SAMPLE_INVENTORY_KEY }, { key: SAMPLE_INVENTORY_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: SAMPLE_INVENTORY_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readLastTemplateValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: LAST_TEMPLATE_KEY }, { key: LAST_TEMPLATE_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: LAST_TEMPLATE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readActiveTemplateValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: ACTIVE_TEMPLATE_KEY }, { key: ACTIVE_TEMPLATE_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: ACTIVE_TEMPLATE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readParameterCacheValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: PARAMETER_CACHE_KEY }, { key: PARAMETER_CACHE_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: PARAMETER_CACHE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readExportWarehouseValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: EXPORT_WAREHOUSE_KEY }, { key: EXPORT_WAREHOUSE_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: EXPORT_WAREHOUSE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readExportWarehouseMapValue = async (): Promise<string | null> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection('settings').findOne({
      $or: [{ _id: EXPORT_WAREHOUSE_MAP_KEY }, { key: EXPORT_WAREHOUSE_MAP_KEY }],
    } as Filter<Document>);
    return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: EXPORT_WAREHOUSE_MAP_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeTemplatesValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Writing templates...',
    context: { length: value.length, provider },
  });
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateMany(
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
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Wrote templates (Prisma)',
  });
};

const writeSampleProductValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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

const writeSampleInventoryValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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

const writeExportWarehouseValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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

const writeExportWarehouseMapValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
      {
        $or: [{ _id: EXPORT_WAREHOUSE_MAP_KEY }, { key: EXPORT_WAREHOUSE_MAP_KEY }],
      } as Filter<Document>,
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

const writeLastTemplateValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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

const writeActiveTemplateValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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

const writeParameterCacheValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection('settings').updateOne(
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
  return await parseTemplates(raw);
};

export const getImportSampleProductId = async (): Promise<string | null> => {
  return readSampleProductValue();
};

export const setImportSampleProductId = async (value: string): Promise<void> => {
  await writeSampleProductValue(value);
};

export const getImportSampleInventoryId = async (): Promise<string | null> => {
  return readSampleInventoryValue();
};

export const setImportSampleInventoryId = async (value: string): Promise<void> => {
  await writeSampleInventoryValue(value);
};

export const getImportLastTemplateId = async (): Promise<string | null> => {
  const value = await readLastTemplateValue();
  return value ? value : null;
};

export const setImportLastTemplateId = async (value: string | null): Promise<void> => {
  await writeLastTemplateValue(value?.trim() ? value.trim() : '');
};

export const getImportActiveTemplateId = async (
  scope?: ActiveTemplateScopeInput
): Promise<string | null> => {
  const value = await readActiveTemplateValue();
  const map = parseActiveTemplateMap(value);
  const scopeKey = buildActiveTemplateScopeKey(scope);
  if (scopeKey) {
    const scopedTemplateId = map.byScope[scopeKey];
    if (scopedTemplateId) return scopedTemplateId;
  }
  return map.defaultTemplateId ?? null;
};

export const setImportActiveTemplateId = async (
  value: string | null,
  scope?: ActiveTemplateScopeInput
): Promise<void> => {
  const current = parseActiveTemplateMap(await readActiveTemplateValue());
  const normalizedValue = normalizeOptionalId(value);
  const scopeKey = buildActiveTemplateScopeKey(scope);

  if (!scopeKey) {
    current.defaultTemplateId = normalizedValue;
  } else if (normalizedValue) {
    current.byScope[scopeKey] = normalizedValue;
  } else {
    delete current.byScope[scopeKey];
  }

  await writeActiveTemplateValue(stringifyActiveTemplateMap(current));
};

export const getExportWarehouseId = async (inventoryId?: string | null): Promise<string | null> => {
  const normalizedInventory = inventoryId?.trim() ?? '';
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
): Promise<void> => {
  const normalizedInventory = inventoryId?.trim() ?? '';
  const normalizedValue = value?.trim() ?? '';
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
    if (!parsed || !Array.isArray(parsed.keys) || typeof parsed.values !== 'object') {
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
}): Promise<void> => {
  const payload: ImportParameterCache = {
    inventoryId: input.inventoryId,
    productId: input.productId,
    keys: input.keys,
    values: input.values,
    updatedAt: new Date().toISOString(),
  };
  await writeParameterCacheValue(JSON.stringify(payload));
};

export const getImportTemplate = async (id: string): Promise<Template | null> => {
  const templates = await listImportTemplates();
  return templates.find((template: Template) => template.id === id) ?? null;
};

export const createImportTemplate = async (input: {
  name: string;
  description?: string | null;
  mappings?: TemplateMapping[];
  parameterImport?: Template['parameterImport'];
}): Promise<Template> => {
  const templates = await listImportTemplates();
  const now = new Date().toISOString();
  const template: Template = {
    id: randomUUID(),
    name: input.name,
    provider: 'base-com',
    config: {},
    description: input.description ?? null,
    mappings: input.mappings ?? [],
    parameterImport: normalizeBaseImportParameterImportSettings(
      input.parameterImport ?? defaultBaseImportParameterImportSettings
    ),
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
    parameterImport: Template['parameterImport'];
  }>
): Promise<Template | null> => {
  const templates = await listImportTemplates();
  const index = templates.findIndex((template: Template) => template.id === id);
  if (index === -1) return null;
  const existing = templates[index]!;
  const updated: Template = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    mappings: input.mappings ?? existing.mappings,
    parameterImport: normalizeBaseImportParameterImportSettings(
      input.parameterImport !== undefined
        ? input.parameterImport
        : (existing.parameterImport ?? defaultBaseImportParameterImportSettings)
    ),
    updatedAt: new Date().toISOString(),
  };
  templates[index] = updated;
  await writeTemplatesValue(JSON.stringify(templates));
  return updated;
};

export const deleteImportTemplate = async (id: string): Promise<boolean> => {
  const templates = await listImportTemplates();
  const next = templates.filter((template: Template) => template.id !== id);
  if (next.length === templates.length) return false;
  await writeTemplatesValue(JSON.stringify(next));
  return true;
};
