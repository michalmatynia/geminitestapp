import 'server-only';

import enMessages from './messages/en.json';

import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type SiteMessages = typeof enMessages;

const defaultMessageLoader = () =>
  import('./messages/en.json').then((module) => module.default as SiteMessages);

const messageLoaders: Partial<Record<string, () => Promise<SiteMessages>>> = {
  pl: () => import('./messages/pl.json').then((module) => module.default as SiteMessages),
  en: defaultMessageLoader,
  de: () => import('./messages/de.json').then((module) => module.default as SiteMessages),
};

export const loadSiteMessages = async (locale: string | null | undefined): Promise<SiteMessages> => {
  const normalizedLocale = normalizeSiteLocale(locale);
  const loader = messageLoaders[normalizedLocale] ?? defaultMessageLoader;

  return loader();
};
