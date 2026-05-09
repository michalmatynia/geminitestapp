/**
 * Internationalization Request Configuration
 * 
 * Server-side i18n configuration for Next.js request handling.
 * Provides:
 * - Locale detection and validation
 * - Message loading per locale
 * - Timezone configuration
 * - Request-scoped i18n context
 */

import { getRequestConfig } from 'next-intl/server';

import { loadSiteMessages } from './messages';
import { siteRouting } from './routing';

import { isSupportedSiteLocale, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

/**
 * Configures i18n for each request
 * Detects locale, loads messages, and sets timezone
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from request (URL, cookie, or header)
  const localeCandidate = await requestLocale;
  
  // Validate and normalize locale, fallback to default
  const locale = isSupportedSiteLocale(localeCandidate)
    ? normalizeSiteLocale(localeCandidate)
    : siteRouting.defaultLocale;

  return {
    /** Current locale for this request */
    locale,
    /** Timezone for date/time formatting */
    timeZone: process.env['NEXT_INTL_TIME_ZONE']?.trim() || 'Europe/Warsaw',
    /** Translated messages for the locale */
    messages: await loadSiteMessages(locale),
  };
});
