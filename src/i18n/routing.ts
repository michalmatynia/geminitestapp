import { defineRouting } from 'next-intl/routing';

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

const enabledLocales = DEFAULT_SITE_I18N_CONFIG.locales
  .filter((locale) => locale.enabled)
  .map((locale) => locale.code);

export const siteRouting = defineRouting({
  locales: enabledLocales,
  defaultLocale: DEFAULT_SITE_I18N_CONFIG.defaultLocale,
  localePrefix: DEFAULT_SITE_I18N_CONFIG.localePrefixMode,
  localeCookie: {
    name: DEFAULT_SITE_I18N_CONFIG.cookieName,
    sameSite: 'lax',
  },
  alternateLinks: false,
});

export type SiteRouting = typeof siteRouting;
export type AppLocale = (typeof siteRouting.locales)[number];
