import { cache } from 'react';
import { headers } from 'next/headers';
import { normalizeLocale, type EcomLocale } from '@/lib/locales';

export const getRequestLocale = cache(async function getRequestLocale(): Promise<EcomLocale> {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get('x-ecom-locale'));
});

export const getRequestLocaleState = cache(async function getRequestLocaleState(): Promise<{
  locale: EcomLocale;
  pathname: string;
  search: string;
}> {
  const requestHeaders = await headers();
  return {
    locale: normalizeLocale(requestHeaders.get('x-ecom-locale')),
    pathname: requestHeaders.get('x-ecom-pathname') || '/',
    search: requestHeaders.get('x-ecom-search') || '',
  };
});
