import { getRequestConfig } from 'next-intl/server';

import { loadSiteMessages } from './messages';
import { siteRouting } from './routing';

import { isSupportedSiteLocale, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export default getRequestConfig(async ({ requestLocale }) => {
  const localeCandidate = await requestLocale;
  const locale = isSupportedSiteLocale(localeCandidate)
    ? normalizeSiteLocale(localeCandidate)
    : siteRouting.defaultLocale;

  return {
    locale,
    messages: await loadSiteMessages(locale),
  };
});
