import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export const KANGUR_ADMIN_LOCALES = ['en', 'pl', 'uk'] as const;

export type KangurAdminLocaleDto = (typeof KANGUR_ADMIN_LOCALES)[number];

export const resolveKangurAdminLocale = (
  locale: string | null | undefined
): KangurAdminLocaleDto => {
  const normalizedLocale = locale?.trim().toLowerCase() ?? '';

  if (normalizedLocale.startsWith('pl')) {
    return 'pl';
  }

  if (normalizedLocale.startsWith('uk')) {
    return 'uk';
  }

  return normalizeSiteLocale(locale) === 'uk' ? 'uk' : normalizeSiteLocale(locale) === 'pl' ? 'pl' : 'en';
};
