/**
 * Internationalization Routing Configuration
 * 
 * Defines routing behavior for multi-language support.
 * Configures:
 * - Enabled locales and default language
 * - URL prefix strategies for locale detection
 * - Cookie-based locale persistence
 * - Alternate link generation for SEO
 */

import { defineRouting } from 'next-intl/routing';

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

// Filter to only enabled locales from configuration
const enabledLocales = DEFAULT_SITE_I18N_CONFIG.locales
  .filter((locale) => locale.enabled)
  .map((locale) => locale.code);

export const siteRouting = defineRouting({
  locales: enabledLocales, // Available language codes
  defaultLocale: DEFAULT_SITE_I18N_CONFIG.defaultLocale, // Fallback language
  localePrefix: DEFAULT_SITE_I18N_CONFIG.localePrefixMode, // URL prefix strategy
  localeCookie: {
    name: DEFAULT_SITE_I18N_CONFIG.cookieName, // Cookie name for persistence
    sameSite: 'lax', // Cookie security policy
  },
  alternateLinks: false, // Disable automatic hreflang generation
});

export type SiteRouting = typeof siteRouting;
export type AppLocale = (typeof siteRouting.locales)[number];
