import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId as _ObjectId } from 'mongodb';

import {
  buildActiveTemplateScopeKey,
  normalizeActiveTemplateId,
  parseScopedActiveTemplateMap,
  stringifyScopedActiveTemplateMap,
  type ActiveTemplateScopeInput,
} from '@/features/integrations/services/active-template-preference';
import { type ImageRetryPreset } from '@/shared/contracts/integrations/base';
import { type Template, type TemplateMapping } from '@/shared/contracts/integrations/templates';
import type { MongoTimestampedStringSettingDocument } from '@/shared/contracts/settings';
import { badRequestError } from '@/shared/errors/app-error';
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { Template, TemplateMapping };

const LOG_SOURCE = 'export-template-repository';

const toMongoId = (value: string): string | _ObjectId =>
  _ObjectId.isValid(value) ? new _ObjectId(value) : value;

const getExportTemplateProvider = async (): Promise<'mongodb'> => {
  const provider = 'mongodb';
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Provider: ${provider}`,
    context: { provider },
  });
  return provider;
};

const logGuardFailure = async (
  message: string,
  error: unknown,
  context: Record<string, unknown>
): Promise<void> => {
  try {
    await logSystemEvent({
      level: 'error',
      source: LOG_SOURCE,
      message,
      error,
      context: {
        ...context,
        guard: true,
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // keep guard path non-throwing
  }
};

const SETTINGS_KEY = 'base_export_templates';
const ACTIVE_TEMPLATE_KEY = 'base_export_active_template_id';
const DEFAULT_INVENTORY_KEY = 'base_export_default_inventory_id';
const DEFAULT_CONNECTION_KEY = 'base_export_default_connection_id';
const STOCK_FALLBACK_KEY = 'base_export_stock_fallback_enabled';
const IMAGE_RETRY_PRESETS_KEY = 'base_export_image_retry_presets';
const BASEHOST_MAPPING_KEYS = new Set(['images_basehost_all', 'image_basehost_all']);
const UNSUPPORTED_PARAMETER_SOURCE_PREFIX = 'parameter:';

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
    void ErrorSystem.captureException(error);
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ExportTemplateRepository] Failed to parse templates',
        error,
        source: 'export-template-repository',
        context: { action: 'parseTemplates' },
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
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

const assertNoUnsupportedParameterSourceMappings = (args: {
  mappings?: TemplateMapping[] | null;
  templateId?: string;
}): void => {
  const mappings = Array.isArray(args.mappings) ? args.mappings : [];
  const unsupportedMappings = mappings.filter((mapping: TemplateMapping) =>
    String(mapping.sourceKey ?? '')
      .trim()
      .toLowerCase()
      .startsWith(UNSUPPORTED_PARAMETER_SOURCE_PREFIX)
  );
  if (unsupportedMappings.length === 0) return;

  const templateRef = args.templateId ? ` "${args.templateId}"` : '';
  throw badRequestError(
    `Export template${templateRef} contains unsupported parameter source mappings. Run "npm run migrate:base-export-template-parameter-sources:v2 -- --write" and retry.`,
    {
      templateId: args.templateId ?? null,
      unsupportedMappingCount: unsupportedMappings.length,
    }
  );
};

const readTemplatesValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
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
};

const readActiveTemplateValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(ACTIVE_TEMPLATE_KEY) }, { key: ACTIVE_TEMPLATE_KEY }],
    });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readDefaultInventoryValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(DEFAULT_INVENTORY_KEY) }, { key: DEFAULT_INVENTORY_KEY }],
    });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readStockFallbackValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(STOCK_FALLBACK_KEY) }, { key: STOCK_FALLBACK_KEY }],
    });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readDefaultConnectionValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(DEFAULT_CONNECTION_KEY) }, { key: DEFAULT_CONNECTION_KEY }],
    });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readImageRetryPresetsValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(IMAGE_RETRY_PRESETS_KEY) }, { key: IMAGE_RETRY_PRESETS_KEY }],
    });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeTemplatesValue = async (value: string): Promise<void> => {
  const provider = await getExportTemplateProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Writing templates...',
    context: { length: value.length, provider },
  });
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateMany(
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
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Wrote templates (Mongo)',
  });
};

const writeActiveTemplateValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateOne(
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
};

const writeDefaultInventoryValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateOne(
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
};

const writeStockFallbackValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateOne(
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
};

const writeDefaultConnectionValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateOne(
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
};

const writeImageRetryPresetsValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | _ObjectId>>('settings')
    .updateOne(
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
  assertNoUnsupportedParameterSourceMappings({
    mappings: input.mappings ?? [],
  });

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
  if (input.mappings !== undefined) {
    assertNoUnsupportedParameterSourceMappings({
      templateId: id,
      mappings: input.mappings,
    });
  }

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
  try {
    const value = await readActiveTemplateValue();
    const map = parseScopedActiveTemplateMap(value);
    const scopeKey = buildActiveTemplateScopeKey(scope);
    if (scopeKey) {
      const scopedTemplateId = map.byScope[scopeKey];
      if (scopedTemplateId) return scopedTemplateId;
    }
    return map.defaultTemplateId ?? null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await logGuardFailure(
      '[ExportTemplateRepository] Failed to read active export template, returning null',
      error,
      {
        action: 'getExportActiveTemplateId',
        connectionId: scope?.connectionId ?? null,
        inventoryId: scope?.inventoryId ?? null,
        fallbackValue: null,
      }
    );
    return null;
  }
};

export const setExportActiveTemplateId = async (
  value: string | null,
  scope?: ActiveTemplateScopeInput
): Promise<void> => {
  const current = parseScopedActiveTemplateMap(await readActiveTemplateValue());
  const normalizedValue = normalizeActiveTemplateId(value);
  const scopeKey = buildActiveTemplateScopeKey(scope);

  if (!scopeKey) {
    current.defaultTemplateId = normalizedValue;
  } else if (normalizedValue) {
    current.byScope[scopeKey] = normalizedValue;
  } else {
    delete current.byScope[scopeKey];
  }

  await writeActiveTemplateValue(stringifyScopedActiveTemplateMap(current));
};

export const getExportDefaultInventoryId = async (): Promise<string | null> => {
  try {
    const value = await readDefaultInventoryValue();
    return value ? value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await logGuardFailure(
      '[ExportTemplateRepository] Failed to read default export inventory, returning null',
      error,
      {
        action: 'getExportDefaultInventoryId',
        fallbackValue: null,
      }
    );
    return null;
  }
};

export const setExportDefaultInventoryId = async (value: string | null): Promise<void> => {
  await writeDefaultInventoryValue(value?.trim() ? value.trim() : '');
};

export const getExportStockFallbackEnabled = async (): Promise<boolean> => {
  try {
    const value = await readStockFallbackValue();
    return value?.trim().toLowerCase() === 'true';
  } catch (error) {
    void ErrorSystem.captureException(error);
    await logGuardFailure(
      '[ExportTemplateRepository] Failed to read stock fallback flag, using disabled fallback',
      error,
      {
        action: 'getExportStockFallbackEnabled',
        fallbackValue: false,
      }
    );
    return false;
  }
};

export const setExportStockFallbackEnabled = async (enabled: boolean): Promise<void> => {
  await writeStockFallbackValue(enabled ? 'true' : 'false');
};

export const getExportDefaultConnectionId = async (): Promise<string | null> => {
  try {
    const value = await readDefaultConnectionValue();
    return value ? value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await logGuardFailure(
      '[ExportTemplateRepository] Failed to read default export connection, returning null',
      error,
      {
        action: 'getExportDefaultConnectionId',
        fallbackValue: null,
      }
    );
    return null;
  }
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
    void ErrorSystem.captureException(error);
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ExportTemplateRepository] Failed to parse image presets',
        error,
        source: 'export-template-repository',
        context: { action: 'getExportImageRetryPresets' },
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
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
