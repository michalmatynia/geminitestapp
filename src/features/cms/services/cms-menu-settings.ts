import { getCmsMenuSettings as getCmsMenuSettingsFromService } from '@/features/cms/services/menu';
import { isDomainZoningEnabled } from './cms-domain';

export const getCmsMenuSettings = async (
  domainId?: string | null,
  locale?: string | null
): Promise<any> => {
  const zoningEnabled = await isDomainZoningEnabled();
  return getCmsMenuSettingsFromService(domainId, locale, zoningEnabled);
};

export const getCmsMenuSettingsCached = getCmsMenuSettings;
