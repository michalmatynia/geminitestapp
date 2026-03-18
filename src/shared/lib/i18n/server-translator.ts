import 'server-only';

import { createTranslator } from 'use-intl/core';

import { loadSiteMessages } from '@/i18n/messages';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { resolvePreferredSiteLocale } from '@/shared/lib/i18n/site-locale';

type TranslatorValues = Record<string, string | number | Date>;

export type SiteTranslator = (key: string, values?: TranslatorValues) => string;

const parseCookieHeader = (cookieHeader: string | null | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!key) {
        return accumulator;
      }

      try {
        accumulator[key] = decodeURIComponent(value);
      } catch {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
};

const getRefererPathname = (request: Request | null | undefined): string | null => {
  const referer = request?.headers.get('referer');
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
};

export const resolveRequestSiteLocale = (input?: {
  locale?: string | null;
  request?: Request | null;
}): string => {
  const explicitLocale = input?.locale ?? input?.request?.headers.get('x-next-intl-locale');
  const cookies = parseCookieHeader(input?.request?.headers.get('cookie'));
  const cookieLocale = cookies[DEFAULT_SITE_I18N_CONFIG.cookieName] ?? null;

  return resolvePreferredSiteLocale({
    pathname: getRefererPathname(input?.request),
    explicitLocale,
    cookieLocale,
    acceptLanguage: input?.request?.headers.get('accept-language'),
  });
};

export const getSiteTranslator = async (input?: {
  locale?: string | null;
  request?: Request | null;
}): Promise<{ locale: string; t: SiteTranslator }> => {
  const locale = resolveRequestSiteLocale(input);
  const messages = await loadSiteMessages(locale);
  const translator = createTranslator({ locale, messages });

  return {
    locale,
    t: ((key: string, values?: TranslatorValues) =>
      translator(key as never, values as never)) as SiteTranslator,
  };
};
