import { cache } from 'react';
import { headers } from 'next/headers';
import { normalizeLocale, type EcomLocale } from '@/lib/locales';

export const getRequestLocale = cache(async (): Promise<EcomLocale> => {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get('x-ecom-locale'));
});

export const getRequestLocaleState = cache(async (): Promise<{
  locale: EcomLocale;
  pathname: string;
  search: string;
}> => {
  const requestHeaders = await headers();
  const rawPathname = requestHeaders.get('x-ecom-pathname');
  const rawSearch = requestHeaders.get('x-ecom-search');
  return {
    locale: normalizeLocale(requestHeaders.get('x-ecom-locale')),
    pathname: rawPathname === null || rawPathname === '' ? '/' : rawPathname,
    search: rawSearch === null || rawSearch === '' ? '' : rawSearch,
  };
});
