export const SUPPORTED_LOCALES = ['en', 'pl'] as const;

export type EcomLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: EcomLocale = 'en';

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isSupportedLocale(value: unknown): value is EcomLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value.toLowerCase());
}

export function toSupportedLocale(value: unknown): EcomLocale | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().split('-')[0];
  return isSupportedLocale(normalized) ? normalized : null;
}

export function normalizeLocale(value: string | null | undefined): EcomLocale {
  return toSupportedLocale(value) ?? DEFAULT_LOCALE;
}

export function normalizeLocaleList(
  values: readonly unknown[],
  fallback: readonly EcomLocale[] = SUPPORTED_LOCALES,
): EcomLocale[] {
  const locales: EcomLocale[] = [];
  const seen = new Set<EcomLocale>();

  for (const value of values) {
    const locale = toSupportedLocale(value);
    if (locale === null || seen.has(locale)) continue;
    seen.add(locale);
    locales.push(locale);
  }

  return locales.length > 0 ? locales : [...fallback];
}

export function stripLocalePrefix(pathname: string): string {
  if (!pathname.startsWith('/')) return pathname;
  const [firstSegment = '', secondSegment = '', ...rest] = pathname.split('/');
  void firstSegment;
  if (!isSupportedLocale(secondSegment)) return pathname.length === 0 ? '/' : pathname;
  const stripped = `/${rest.join('/')}`;
  const cleaned = stripped.replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function splitPathQueryHash(href: string): { pathname: string; query: string; hash: string } {
  const hashIndex = href.indexOf('#');
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const queryIndex = withoutHash.indexOf('?');
  return {
    pathname: queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash,
    query: queryIndex >= 0 ? withoutHash.slice(queryIndex) : '',
    hash,
  };
}

// eslint-disable-next-line complexity
export function localizeHref(href: string, locale: EcomLocale): string {
  if (
    href.length === 0 ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(href)
  ) {
    return href;
  }

  if (!href.startsWith('/')) return href;

  const { pathname, query, hash } = splitPathQueryHash(href);
  const stripped = stripLocalePrefix(pathname.length === 0 ? '/' : pathname);
  const localizedPath = locale === DEFAULT_LOCALE
    ? stripped
    : `/${locale}${stripped === '/' ? '' : stripped}`;

  return `${localizedPath}${query}${hash}`;
}

export function switchLocalePath(pathname: string, locale: EcomLocale, search = ''): string {
  const stripped = stripLocalePrefix(pathname.length === 0 ? '/' : pathname);
  return localizeHref(`${stripped}${search}`, locale);
}

function usesPolishFewForm(count: number): boolean {
  const lastDigit = Math.abs(count) % 10;
  const lastTwoDigits = Math.abs(count) % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);
}

export function productCountWord(
  count: number,
  locale: EcomLocale,
  singular: string,
  plural: string,
): string {
  if (locale !== 'pl') return count === 1 ? singular : plural;
  if (count === 1) return 'produkt';
  if (usesPolishFewForm(count)) return 'produkty';
  return 'produktów';
}

export function pieceCountWord(
  count: number,
  locale: EcomLocale,
  singular: string,
  plural: string,
): string {
  if (locale !== 'pl') return count === 1 ? singular : plural;
  if (count === 1) return 'sztuka';
  if (usesPolishFewForm(count)) return 'sztuki';
  return 'sztuk';
}

export function resultCountWord(
  count: number,
  locale: EcomLocale,
  singular: string,
  plural: string,
): string {
  if (locale !== 'pl') return count === 1 ? singular : plural;
  if (count === 1) return 'wynik';
  if (usesPolishFewForm(count)) return 'wyniki';
  return 'wyników';
}

export function savedProductStateWord(count: number, locale: EcomLocale, savedLabel: string): string {
  if (locale !== 'pl') return savedLabel;
  if (count === 1) return 'zapisany';
  if (usesPolishFewForm(count)) return 'zapisane';
  return 'zapisanych';
}

export function formatPrice(price: number, locale: EcomLocale): string {
  const localeTag = locale === 'pl' ? 'pl-PL' : 'en-US';
  const minimumFractionDigits = Number.isInteger(price) ? 0 : 2;
  return `${price.toLocaleString(localeTag, {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  })} zł`;
}

export function formatPriceTotal(total: number, locale: EcomLocale): string {
  return formatPrice(total, locale);
}
