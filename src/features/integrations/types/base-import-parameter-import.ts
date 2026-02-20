import type {
  BaseImportParameterImportModeDto,
  BaseImportParameterLanguageScopeDto,
  BaseImportParameterMatchByDto,
  BaseImportParameterImportSettingsDto,
} from '@/shared/contracts/integrations';
import { DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS } from '@/shared/contracts/integrations';

export const defaultBaseImportParameterImportSettings = DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS;

export type BaseImportParameterImportMode = BaseImportParameterImportModeDto;

export type BaseImportParameterLanguageScope = BaseImportParameterLanguageScopeDto;

export type BaseImportParameterMatchBy = BaseImportParameterMatchByDto;

export type BaseImportParameterImportSettings = BaseImportParameterImportSettingsDto;

const normalizeMode = (
  value: unknown
): BaseImportParameterImportMode =>
  value === 'mapped' ? 'mapped' : 'all';

const normalizeLanguageScope = (
  value: unknown
): BaseImportParameterLanguageScope =>
  value === 'default_only' ? 'default_only' : 'catalog_languages';

const normalizeMatchBy = (
  value: unknown
): BaseImportParameterMatchBy =>
  value === 'name_only' ? 'name_only' : 'base_id_then_name';

export const normalizeBaseImportParameterImportSettings = (
  input: unknown
): BaseImportParameterImportSettings => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ...defaultBaseImportParameterImportSettings };
  }
  const record = input as Record<string, unknown>;
  return {
    enabled:
      typeof record['enabled'] === 'boolean'
        ? record['enabled']
        : defaultBaseImportParameterImportSettings.enabled,
    mode: normalizeMode(record['mode']),
    languageScope: normalizeLanguageScope(record['languageScope']),
    createMissingParameters:
      typeof record['createMissingParameters'] === 'boolean'
        ? record['createMissingParameters']
        : defaultBaseImportParameterImportSettings.createMissingParameters,
    overwriteExistingValues:
      typeof record['overwriteExistingValues'] === 'boolean'
        ? record['overwriteExistingValues']
        : defaultBaseImportParameterImportSettings.overwriteExistingValues,
    matchBy: normalizeMatchBy(record['matchBy']),
  };
};
