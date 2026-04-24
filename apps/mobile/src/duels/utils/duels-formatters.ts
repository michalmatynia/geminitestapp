import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../../i18n/kangurMobileI18n';

export function localizeDuelText(
  value: KangurMobileLocalizedValue<string>,
  locale: KangurMobileLocale,
): string {
  return value[locale];
}

export function localizeSimpleDuelText(
  de: string,
  en: string,
  pl: string,
  locale: KangurMobileLocale,
): string {
  if (locale === 'de') return de;
  if (locale === 'en') return en;
  return pl;
}
