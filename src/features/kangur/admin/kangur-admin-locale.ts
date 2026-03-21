import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export const KANGUR_ADMIN_LOCALES = ['en', 'pl'] as const;

export type KangurAdminLocaleDto = (typeof KANGUR_ADMIN_LOCALES)[number];

export const resolveKangurAdminLocale = (
  locale: string | null | undefined
): KangurAdminLocaleDto => (normalizeSiteLocale(locale) === 'pl' ? 'pl' : 'en');
