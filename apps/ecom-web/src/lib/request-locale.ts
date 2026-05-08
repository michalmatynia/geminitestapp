import { headers } from 'next/headers';
import { normalizeLocale, type EcomLocale } from '@/lib/locales';

export async function getRequestLocale(): Promise<EcomLocale> {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get('x-ecom-locale'));
}

export async function getRequestLocaleState(): Promise<{
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
}
