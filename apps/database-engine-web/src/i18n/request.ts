import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { isSupportedSiteLocale, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import { loadDatabaseEngineMessages } from './messages';

export default getRequestConfig(async ({ requestLocale }) => {
  const localeCandidate = await requestLocale;
  const locale = isSupportedSiteLocale(localeCandidate)
    ? normalizeSiteLocale(localeCandidate)
    : DEFAULT_SITE_I18N_CONFIG.defaultLocale;

  return {
    locale,
    timeZone: process.env['NEXT_INTL_TIME_ZONE']?.trim() || 'Europe/Warsaw',
    messages: await loadDatabaseEngineMessages(locale),
  };
});
