import type { ProductParameter, ProductParameterCreateInput as ParameterCreateInput } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import type { ImportTemplateParameterImport } from './templates';

export type ExtractedBaseParameter = {
  baseParameterId: string | null;
  namesByLanguage: Record<string, string>;
  valuesByLanguage: Record<string, string>;
};

export type BaseParameterImportSummary = {
  extracted: number;
  resolved: number;
  created: number;
  written: number;
};

export type ApplyBaseParameterImportInput = {
  settings: ImportTemplateParameterImport;
  record: Record<string, unknown>;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
  existingValues: ProductParameterValue[];
  catalogId: string;
  catalogLanguageCodes: string[];
  defaultLanguageCode?: string | null;
  connectionId?: string | null;
  inventoryId?: string | null;
  prefetchedParameters?: ProductParameter[] | null;
  prefetchedLinks?: Record<string, string> | null;
  parameterRepository: {
    listParameters: (input: { catalogId: string }) => Promise<ProductParameter[]>;
    createParameter: (input: ParameterCreateInput) => Promise<ProductParameter>;
  };
};

export type ApplyBaseParameterImportResult = {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: {
    extracted: number;
    resolved: number;
    created: number;
    written: number;
  };
};

export const defaultBaseImportParameterImportSettings: ImportTemplateParameterImport = {
  enabled: false,
  mode: 'all',
  languageScope: 'catalog_languages',
  createMissingParameters: false,
  overwriteExistingValues: false,
  matchBy: 'base_id_then_name',
};

export const normalizeBaseImportParameterImportSettings = (
  value: unknown
): ImportTemplateParameterImport => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultBaseImportParameterImportSettings };
  }
  const v = value as Record<string, unknown>;
  return {
    enabled:
      typeof v['enabled'] === 'boolean'
        ? v['enabled']
        : defaultBaseImportParameterImportSettings.enabled,
    mode: v['mode'] === 'mapped' ? 'mapped' : 'all',
    languageScope: v['languageScope'] === 'default_only' ? 'default_only' : 'catalog_languages',
    createMissingParameters:
      typeof v['createMissingParameters'] === 'boolean'
        ? v['createMissingParameters']
        : defaultBaseImportParameterImportSettings.createMissingParameters,
    overwriteExistingValues:
      typeof v['overwriteExistingValues'] === 'boolean'
        ? v['overwriteExistingValues']
        : defaultBaseImportParameterImportSettings.overwriteExistingValues,
    matchBy: v['matchBy'] === 'name_only' ? 'name_only' : 'base_id_then_name',
  };
};
