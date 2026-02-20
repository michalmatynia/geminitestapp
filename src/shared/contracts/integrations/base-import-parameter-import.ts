import { z } from 'zod';

export const baseImportParameterImportModeSchema = z.enum(['all', 'mapped']);
export type BaseImportParameterImportMode = z.infer<typeof baseImportParameterImportModeSchema>;

export const baseImportParameterLanguageScopeSchema = z.enum(['catalog_languages', 'default_only']);
export type BaseImportParameterLanguageScope = z.infer<typeof baseImportParameterLanguageScopeSchema>;

export const baseImportParameterMatchBySchema = z.enum(['base_id_then_name', 'name_only']);
export type BaseImportParameterMatchBy = z.infer<typeof baseImportParameterMatchBySchema>;

export const baseImportParameterImportSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: baseImportParameterImportModeSchema,
  languageScope: baseImportParameterLanguageScopeSchema,
  createMissingParameters: z.boolean(),
  overwriteExistingValues: z.boolean(),
  matchBy: baseImportParameterMatchBySchema,
});

export type BaseImportParameterImportSettings = z.infer<typeof baseImportParameterImportSettingsSchema>;

export const defaultBaseImportParameterImportSettings: BaseImportParameterImportSettings = {
  enabled: false,
  mode: 'all',
  languageScope: 'catalog_languages',
  createMissingParameters: true,
  overwriteExistingValues: false,
  matchBy: 'base_id_then_name',
};

export function normalizeBaseImportParameterImportSettings(input: unknown): BaseImportParameterImportSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as any;
    return {
      enabled: typeof record.enabled === 'boolean' ? record.enabled : defaultBaseImportParameterImportSettings.enabled,
      mode: typeof record.mode === 'string' && ['all', 'mapped'].includes(record.mode) ? record.mode : defaultBaseImportParameterImportSettings.mode,
      languageScope: typeof record.languageScope === 'string' && ['catalog_languages', 'default_only'].includes(record.languageScope) ? record.languageScope : defaultBaseImportParameterImportSettings.languageScope,
      createMissingParameters: typeof record.createMissingParameters === 'boolean' ? record.createMissingParameters : defaultBaseImportParameterImportSettings.createMissingParameters,
      overwriteExistingValues: typeof record.overwriteExistingValues === 'boolean' ? record.overwriteExistingValues : defaultBaseImportParameterImportSettings.overwriteExistingValues,
      matchBy: typeof record.matchBy === 'string' && ['base_id_then_name', 'name_only'].includes(record.matchBy) ? record.matchBy : defaultBaseImportParameterImportSettings.matchBy,
    };
  }
  return defaultBaseImportParameterImportSettings;
}
