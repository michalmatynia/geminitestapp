import { z } from 'zod';

export const CMS_DOMAIN_SETTINGS_KEY = 'cms_domain_settings';

export const cmsDomainSettingsSchema = z.object({
  defaultDomainId: z.string().nullable(),
  zoningEnabled: z.boolean(),
});

export type CmsDomainSettings = z.infer<typeof cmsDomainSettingsSchema>;

export function normalizeCmsDomainSettings(input: unknown): CmsDomainSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as any;
    return {
      defaultDomainId: typeof record.defaultDomainId === 'string' ? record.defaultDomainId : null,
      zoningEnabled: typeof record.zoningEnabled === 'boolean' ? record.zoningEnabled : false,
    };
  }
  return {
    defaultDomainId: null,
    zoningEnabled: false,
  };
}
