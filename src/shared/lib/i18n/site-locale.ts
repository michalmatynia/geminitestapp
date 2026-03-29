import {
  DEFAULT_SITE_I18N_CONFIG,
  type LocalizedText,
  type SiteI18nConfig,
} from '@/shared/contracts/site-i18n';

const normalizeSegment = (value: string): string => value.trim().replace(/^\/+|\/+$/g, '');

const toLocaleList = (config?: SiteI18nConfig): string[] =>
  (config ?? DEFAULT_SITE_I18N_CONFIG).locales
    .filter((locale) => locale.enabled)
    .map((locale) => locale.code.toLowerCase());

export const getEnabledSiteLocaleCodes = (config?: SiteI18nConfig): string[] => toLocaleList(config);

export const getDefaultSiteLocaleCode = (config?: SiteI18nConfig): string =>
  (config ?? DEFAULT_SITE_I18N_CONFIG).defaultLocale.toLowerCase();

export const normalizeSiteLocale = (
  locale: string | null | undefined,
  config?: SiteI18nConfig
): string => {
  const normalized = typeof locale === 'string' ? locale.trim().toLowerCase() : '';
  if (!normalized) {
    return getDefaultSiteLocaleCode(config);
  }

  return isSupportedSiteLocale(normalized, config)
    ? normalized
    : getDefaultSiteLocaleCode(config);
};

export const isSupportedSiteLocale = (
  locale: string | null | undefined,
  config?: SiteI18nConfig
): boolean => {
  if (!locale) return false;
  const normalized = locale.trim().toLowerCase();
  return toLocaleList(config).includes(normalized);
};

export const getPathLocale = (
  pathname: string | null | undefined,
  config?: SiteI18nConfig
): string | null => {
  if (!pathname) return null;
  const firstSegment = normalizeSegment(pathname).split('/')[0] ?? '';
  if (!firstSegment) return null;
  return isSupportedSiteLocale(firstSegment, config) ? firstSegment.toLowerCase() : null;
};

export const stripSiteLocalePrefix = (
  pathname: string | null | undefined,
  config?: SiteI18nConfig
): string => {
  const normalizedPath = pathname?.trim() || '/';
  if (normalizedPath === '/') return '/';

  const segments = normalizedPath.split('/').filter(Boolean);
  if (!segments.length) return '/';

  if (!isSupportedSiteLocale(segments[0], config)) {
    return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  }

  const stripped = `/${segments.slice(1).join('/')}`;
  return stripped === '/' ? '/' : stripped.replace(/\/+$/, '') || '/';
};

export const buildLocalizedPathname = (
  pathname: string,
  locale: string,
  config?: SiteI18nConfig
): string => {
  const normalizedLocale = normalizeSiteLocale(locale, config);
  const normalizedPath = stripSiteLocalePrefix(pathname, config);
  const effectiveConfig = config ?? DEFAULT_SITE_I18N_CONFIG;
  const defaultLocale = getDefaultSiteLocaleCode(effectiveConfig);
  const shouldOmitPrefix =
    effectiveConfig.localePrefixMode === 'never' ||
    (effectiveConfig.localePrefixMode === 'as-needed' && normalizedLocale === defaultLocale);

  if (shouldOmitPrefix) {
    return normalizedPath;
  }

  return normalizedPath === '/'
    ? `/${normalizedLocale}`
    : `/${normalizedLocale}${normalizedPath}`;
};

const parseAcceptLanguage = (value: string | null | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim().toLowerCase() ?? '')
    .filter(Boolean);
};

export const resolvePreferredSiteLocale = (input: {
  pathname?: string | null;
  explicitLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  config?: SiteI18nConfig;
}): string => {
  const { pathname, explicitLocale, cookieLocale, acceptLanguage, config } = input;

  const directCandidates = [explicitLocale, getPathLocale(pathname, config), cookieLocale];
  for (const candidate of directCandidates) {
    if (isSupportedSiteLocale(candidate, config)) {
      return normalizeSiteLocale(candidate, config);
    }
  }

  const accepted = parseAcceptLanguage(acceptLanguage);
  for (const candidate of accepted) {
    if (isSupportedSiteLocale(candidate, config)) {
      return normalizeSiteLocale(candidate, config);
    }

    const languageOnly = candidate.split('-')[0] ?? '';
    if (isSupportedSiteLocale(languageOnly, config)) {
      return normalizeSiteLocale(languageOnly, config);
    }
  }

  return getDefaultSiteLocaleCode(config);
};

export const getLocaleFallbackChain = (
  locale: string | null | undefined,
  config?: SiteI18nConfig
): string[] => {
  const effectiveConfig = config ?? DEFAULT_SITE_I18N_CONFIG;
  const normalizedLocale = normalizeSiteLocale(locale, effectiveConfig);
  const configuredFallbacks = effectiveConfig.fallbacks[normalizedLocale] ?? [];
  const defaultLocale = getDefaultSiteLocaleCode(effectiveConfig);
  return Array.from(new Set([normalizedLocale, ...configuredFallbacks, defaultLocale]));
};

const toTrimmedNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveLocalizedRecordValue = (
  record: Record<string, unknown>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    const resolved = toTrimmedNonEmptyString(record[key]);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

export const resolveLocalizedText = (
  value: LocalizedText | string | null | undefined,
  locale: string | null | undefined,
  config?: SiteI18nConfig
): string | null => {
  if (typeof value === 'string') {
    return toTrimmedNonEmptyString(value);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value;
  return (
    resolveLocalizedRecordValue(record, getLocaleFallbackChain(locale, config)) ??
    resolveLocalizedRecordValue(record, Object.keys(record))
  );
};

export const getStaticSiteLocaleParams = (config?: SiteI18nConfig): Array<{ locale: string }> =>
  getEnabledSiteLocaleCodes(config).map((locale) => ({ locale }));
