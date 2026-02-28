import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export/utils/image-retry-presets';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import type {
  ImageRetryPreset,
  Template as DomainImportExportTemplate,
  TemplateMapping as DomainImportExportTemplateMapping,
} from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type SettingDoc = {
  _id: string | ObjectId;
  key?: string;
  value?: string;
  updatedAt?: Date;
  createdAt?: Date;
};

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

type ExportTemplateProvider = 'mongodb' | 'prisma';
const LOG_SOURCE = 'export-template-repository';

const getExportTemplateProvider = async (): Promise<ExportTemplateProvider> => {
  const provider = await getProductDataProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Provider: ${provider}`,
    context: { provider },
  });
  return provider as ExportTemplateProvider;
};

export type Template = DomainImportExportTemplate;
export type TemplateMapping = DomainImportExportTemplateMapping;

const SETTINGS_KEY = 'base_export_templates';
const ACTIVE_TEMPLATE_KEY = 'base_export_active_template_id';
const DEFAULT_INVENTORY_KEY = 'base_export_default_inventory_id';
const DEFAULT_CONNECTION_KEY = 'base_export_default_connection_id';
const STOCK_FALLBACK_KEY = 'base_export_stock_fallback_enabled';
const IMAGE_RETRY_PRESETS_KEY = 'base_export_image_retry_presets';
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
      void ErrorSystem.logWarning('[ExportTemplateRepository] Parsed value is not an array', {
        service: 'export-template-repository',
        parsed,
      });
      return [];
    }
    return parsed.filter(Boolean).map((template: Template) => ({
      ...template,
      mappings: stripBasehostMappings(Array.isArray(template.mappings) ? template.mappings : []),
    })) as Template[];
  } catch (error) {
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ExportTemplateRepository] Failed to parse templates',
        error,
        source: 'export-template-repository',
        context: { action: 'parseTemplates' },
      });
    } catch (logError) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[ExportTemplateRepository] Failed to parse templates (and logging failed):',
        logError,
        { originalError: error }
      );
    }
    return [];
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
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }],
    });
    const val = typeof doc?.value === 'string' ? doc.value : null;
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

const readActiveTemplateValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(ACTIVE_TEMPLATE_KEY) }, { key: ACTIVE_TEMPLATE_KEY }],
    });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: ACTIVE_TEMPLATE_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readDefaultInventoryValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(DEFAULT_INVENTORY_KEY) }, { key: DEFAULT_INVENTORY_KEY }],
    });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: DEFAULT_INVENTORY_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readStockFallbackValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(STOCK_FALLBACK_KEY) }, { key: STOCK_FALLBACK_KEY }],
    });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: STOCK_FALLBACK_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readDefaultConnectionValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(DEFAULT_CONNECTION_KEY) }, { key: DEFAULT_CONNECTION_KEY }],
    });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: DEFAULT_CONNECTION_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readImageRetryPresetsValue = async (): Promise<string | null> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(IMAGE_RETRY_PRESETS_KEY) }, { key: IMAGE_RETRY_PRESETS_KEY }],
    });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const setting = await prisma.setting.findUnique({
    where: { key: IMAGE_RETRY_PRESETS_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeTemplatesValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Writing templates...',
    context: { length: value.length, provider },
  });
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateMany(
      { $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }] },
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

const writeActiveTemplateValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(ACTIVE_TEMPLATE_KEY) }, { key: ACTIVE_TEMPLATE_KEY }] },
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

const writeDefaultInventoryValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(DEFAULT_INVENTORY_KEY) }, { key: DEFAULT_INVENTORY_KEY }] },
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

const writeStockFallbackValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(STOCK_FALLBACK_KEY) }, { key: STOCK_FALLBACK_KEY }] },
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

const writeDefaultConnectionValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(DEFAULT_CONNECTION_KEY) }, { key: DEFAULT_CONNECTION_KEY }] },
      {
        $set: {
          value,
          key: DEFAULT_CONNECTION_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: DEFAULT_CONNECTION_KEY },
    update: { value },
    create: { key: DEFAULT_CONNECTION_KEY, value },
  });
};

const writeImageRetryPresetsValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(IMAGE_RETRY_PRESETS_KEY) }, { key: IMAGE_RETRY_PRESETS_KEY }] },
      {
        $set: {
          value,
          key: IMAGE_RETRY_PRESETS_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: IMAGE_RETRY_PRESETS_KEY },
    update: { value },
    create: { key: IMAGE_RETRY_PRESETS_KEY, value },
  });
};

export const listExportTemplates = async (): Promise<Template[]> => {
  const raw = await readTemplatesValue();
  return await parseTemplates(raw);
};

export const getExportTemplate = async (id: string): Promise<Template | null> => {
  const templates = await listExportTemplates();
  return templates.find((template: Template) => template.id === id) ?? null;
};

export const createExportTemplate = async (input: {
  name: string;
  description?: string | null;
  mappings?: TemplateMapping[];
  exportImagesAsBase64?: boolean;
}): Promise<Template> => {
  const templates = await listExportTemplates();
  const now = new Date().toISOString();
  const template: Template = {
    id: randomUUID(),
    name: input.name,
    provider: 'base',
    description: input.description ?? null,
    mappings: input.mappings ?? [],
    config: {},
    exportImagesAsBase64: input.exportImagesAsBase64 ?? false,
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
    exportImagesAsBase64: boolean | undefined;
  }>
): Promise<Template | null> => {
  const templates = await listExportTemplates();
  const index = templates.findIndex((template: Template) => template.id === id);
  if (index === -1) return null;
  const existing = templates[index]!;
  const updated = {
    id: existing.id,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    mappings: input.mappings ?? existing.mappings,
    exportImagesAsBase64:
      input.exportImagesAsBase64 !== undefined
        ? input.exportImagesAsBase64
        : (existing.exportImagesAsBase64 ?? false),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  } as Template;
  templates[index] = updated;
  await writeTemplatesValue(JSON.stringify(templates));
  return updated;
};

export const deleteExportTemplate = async (id: string): Promise<boolean> => {
  const templates = await listExportTemplates();
  const next = templates.filter((template: Template) => template.id !== id);
  if (next.length === templates.length) return false;
  await writeTemplatesValue(JSON.stringify(next));
  return true;
};

export const getExportActiveTemplateId = async (
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

export const setExportActiveTemplateId = async (
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

export const getExportDefaultInventoryId = async (): Promise<string | null> => {
  const value = await readDefaultInventoryValue();
  return value ? value : null;
};

export const setExportDefaultInventoryId = async (value: string | null): Promise<void> => {
  await writeDefaultInventoryValue(value?.trim() ? value.trim() : '');
};

export const getExportStockFallbackEnabled = async (): Promise<boolean> => {
  const value = await readStockFallbackValue();
  return value?.trim().toLowerCase() === 'true';
};

export const setExportStockFallbackEnabled = async (enabled: boolean): Promise<void> => {
  await writeStockFallbackValue(enabled ? 'true' : 'false');
};

export const getExportDefaultConnectionId = async (): Promise<string | null> => {
  const value = await readDefaultConnectionValue();
  return value ? value : null;
};

export const setExportDefaultConnectionId = async (value: string | null): Promise<void> => {
  await writeDefaultConnectionValue(value?.trim() ? value.trim() : '');
};

export const getExportImageRetryPresets = async (): Promise<ImageRetryPreset[]> => {
  const raw = await readImageRetryPresetsValue();
  if (!raw) return getDefaultImageRetryPresets();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeImageRetryPresets(parsed);
  } catch (error) {
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ExportTemplateRepository] Failed to parse image presets',
        error,
        source: 'export-template-repository',
        context: { action: 'getExportImageRetryPresets' },
      });
    } catch (logError) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[ExportTemplateRepository] Failed to parse image presets (and logging failed):',
        logError,
        { originalError: error }
      );
    }
    return getDefaultImageRetryPresets();
  }
};

export const setExportImageRetryPresets = async (presets: ImageRetryPreset[]): Promise<void> => {
  const normalized = normalizeImageRetryPresets(presets);
  await writeImageRetryPresetsValue(JSON.stringify(normalized));
};
