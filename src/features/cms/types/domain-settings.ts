import type { CmsDomainSettingsDto } from '@/shared/contracts/cms';
import { CMS_DOMAIN_SETTINGS_KEY as SETTING_KEY } from '@/shared/contracts/cms';

export const CMS_DOMAIN_SETTINGS_KEY = SETTING_KEY;

export type CmsDomainSettings = CmsDomainSettingsDto;

export const DEFAULT_CMS_DOMAIN_SETTINGS: CmsDomainSettings = {
  zoningEnabled: true,
};

export const normalizeCmsDomainSettings = (
  input?: Partial<CmsDomainSettings> | null
): CmsDomainSettings => ({
  zoningEnabled:
    typeof input?.zoningEnabled === 'boolean'
      ? input.zoningEnabled
      : DEFAULT_CMS_DOMAIN_SETTINGS.zoningEnabled,
});
