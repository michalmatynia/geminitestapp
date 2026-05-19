import 'server-only';

import { randomUUID } from 'crypto';

import {
  buildActiveTemplateScopeKey,
  normalizeActiveTemplateId,
  parseScopedActiveTemplateMap,
  stringifyScopedActiveTemplateMap,
  type ActiveTemplateScopeInput,
} from '@/features/integrations/services/active-template-preference';
import {
  EXPORT_WAREHOUSE_SKIP_VALUE,
  parseExportWarehouseByInventoryMap,
  stringifyExportWarehouseByInventoryMap,
} from '@/features/integrations/services/export-warehouse-preference';
import {
  readImportExportSettingValue,
  writeImportExportSettingValue,
} from '@/features/integrations/services/import-export-settings-store';
import type { ImportParameterCacheResponse } from '@/shared/contracts/integrations/base-com';
import type { IntegrationTemplate as Template, IntegrationTemplateMapping as TemplateMapping } from '@/shared/contracts/integrations';
import { normalizeBaseImportParameterImportSettings, defaultBaseImportParameterImportSettings } from '@/shared/contracts/integrations/parameter-import';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const LOG_SOURCE = 'import-template-repository';

const getImportTemplateProvider = async (): Promise<'mongodb'> => {
  const provider = 'mongodb';
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Provider: ${provider}`,
    context: { provider },
  });
  return provider;
};

const SETTINGS_KEY = 'base_import_templates';
const SAMPLE_PRODUCT_KEY = 'base_import_sample_product_id';
const SAMPLE_INVENTORY_KEY = 'base_import_sample_inventory_id';
const LAST_TEMPLATE_KEY = 'base_import_last_template_id';
const ACTIVE_TEMPLATE_KEY = 'base_import_active_template_id';
const PARAMETER_CACHE_KEY = 'base_import_parameter_cache';
const EXPORT_WAREHOUSE_MAP_KEY = 'base_export_warehouse_by_inventory';
const BASEHOST_MAPPING_KEYS = new Set(['images_basehost_all', 'image_basehost_all']);

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
    void ErrorSystem.captureException(error);
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[ImportTemplateRepository] Failed to parse templates',
        error,
        source: 'import-template-repository',
        context: { action: 'parseTemplates' },
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
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

const readTemplatesValue = async (): Promise<string | null> => {
  const val = await readImportExportSettingValue(SETTINGS_KEY);
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Read templates (Mongo)',
    context: { length: val ? val.length : 0 },
  });
  return val;
};

const readSampleProductValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(SAMPLE_PRODUCT_KEY);
};

const readSampleInventoryValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(SAMPLE_INVENTORY_KEY);
};

const readLastTemplateValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(LAST_TEMPLATE_KEY);
};

const readActiveTemplateValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(ACTIVE_TEMPLATE_KEY);
};

const readParameterCacheValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(PARAMETER_CACHE_KEY);
};

const readExportWarehouseMapValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(EXPORT_WAREHOUSE_MAP_KEY);
};

const writeTemplatesValue = async (value: string): Promise<void> => {
  const provider = await getImportTemplateProvider();
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Writing templates...',
    context: { length: value.length, provider },
  });
  await writeImportExportSettingValue(SETTINGS_KEY, value);
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: 'Wrote templates (Mongo)',
  });
};

const writeSampleProductValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(SAMPLE_PRODUCT_KEY, value);
};

const writeSampleInventoryValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(SAMPLE_INVENTORY_KEY, value);
};

const writeExportWarehouseMapValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(EXPORT_WAREHOUSE_MAP_KEY, value);
};

const writeLastTemplateValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(LAST_TEMPLATE_KEY, value);
};

const writeActiveTemplateValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(ACTIVE_TEMPLATE_KEY, value);
};

const writeParameterCacheValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(PARAMETER_CACHE_KEY, value);
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
  const map = parseScopedActiveTemplateMap(value);
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

export const getExportWarehouseId = async (inventoryId?: string | null): Promise<string | null> => {
  const normalizedInventory = inventoryId?.trim() ?? '';
  if (!normalizedInventory) return null;

  const rawMap = await readExportWarehouseMapValue();
  const map = parseExportWarehouseByInventoryMap(rawMap);
  const mapped = map[normalizedInventory];
  if (!mapped || mapped === EXPORT_WAREHOUSE_SKIP_VALUE) {
    return null;
  }
  return mapped;
};

export const setExportWarehouseId = async (
  value: string | null,
  inventoryId?: string | null
): Promise<void> => {
  const normalizedInventory = inventoryId?.trim() ?? '';
  if (!normalizedInventory) return;

  const normalizedValue = value?.trim() ?? '';
  const rawMap = await readExportWarehouseMapValue();
  const map = parseExportWarehouseByInventoryMap(rawMap);
  map[normalizedInventory] = normalizedValue || EXPORT_WAREHOUSE_SKIP_VALUE;
  await writeExportWarehouseMapValue(stringifyExportWarehouseByInventoryMap(map));
};

export const getImportParameterCache =
  async (): Promise<ImportParameterCacheResponse | null> => {
  const raw = await readParameterCacheValue();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ImportParameterCacheResponse;
    if (!parsed || !Array.isArray(parsed.keys) || typeof parsed.values !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const setImportParameterCache = async (input: {
  inventoryId: string | null;
  productId: string | null;
  keys: string[];
  values: Record<string, string>;
}): Promise<void> => {
  const payload: ImportParameterCacheResponse = {
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
