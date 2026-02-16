export type BaseImportParameterImportMode = 'all' | 'mapped';

export type BaseImportParameterLanguageScope =
  | 'catalog_languages'
  | 'default_only';

export type BaseImportParameterMatchBy = 'base_id_then_name' | 'name_only';

export type BaseImportParameterImportSettings = {
  enabled: boolean;
  mode: BaseImportParameterImportMode;
  languageScope: BaseImportParameterLanguageScope;
  createMissingParameters: boolean;
  overwriteExistingValues: boolean;
  matchBy: BaseImportParameterMatchBy;
};

export const defaultBaseImportParameterImportSettings: BaseImportParameterImportSettings =
  {
    enabled: false,
    mode: 'all',
    languageScope: 'catalog_languages',
    createMissingParameters: true,
    overwriteExistingValues: false,
    matchBy: 'base_id_then_name',
  };

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
