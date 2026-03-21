import 'server-only';

import enMessages from './messages/en.json';

import {
  getDefaultSiteLocaleCode,
  getLocaleFallbackChain,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';

export type SiteMessages = typeof enMessages;

type SiteMessageValue =
  | string
  | number
  | boolean
  | null
  | SiteMessageValue[]
  | { [key: string]: SiteMessageValue };

type SiteMessageDictionary = { [key: string]: SiteMessageValue };

const isPlainMessageObject = (value: unknown): value is SiteMessageDictionary =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeSiteMessageDictionaries = (
  base: SiteMessageDictionary,
  overrides: SiteMessageDictionary
): SiteMessageDictionary => {
  const next: SiteMessageDictionary = { ...base };

  for (const [key, overrideValue] of Object.entries(overrides)) {
    const baseValue = next[key];

    next[key] =
      isPlainMessageObject(baseValue) && isPlainMessageObject(overrideValue)
        ? mergeSiteMessageDictionaries(baseValue, overrideValue)
        : overrideValue;
  }

  return next;
};

const defaultMessageLoader = () =>
  import('./messages/pl.json').then((module) => module.default as SiteMessageDictionary);

const messageLoaders: Partial<Record<string, () => Promise<SiteMessageDictionary>>> = {
  pl: () => import('./messages/pl.json').then((module) => module.default),
  en: () => import('./messages/en.json').then((module) => module.default),
  de: () => import('./messages/de.json').then((module) => module.default),
  uk: () => import('./messages/uk.json').then((module) => module.default),
};

export const loadSiteMessages = async (locale: string | null | undefined): Promise<SiteMessages> => {
  const normalizedLocale = normalizeSiteLocale(locale);
  const loaders = getLocaleFallbackChain(normalizedLocale)
    .slice()
    .reverse()
    .reduce<Array<() => Promise<SiteMessageDictionary>>>((accumulator, candidateLocale) => {
      const loader = messageLoaders[candidateLocale];
      if (loader) {
        accumulator.push(loader);
      }
      return accumulator;
    }, []);

  if (loaders.length === 0) {
    const fallbackLoader =
      messageLoaders[getDefaultSiteLocaleCode()] ?? messageLoaders.en ?? defaultMessageLoader;
    return (await fallbackLoader()) as SiteMessages;
  }

  let mergedMessages: SiteMessageDictionary = {};

  for (const loader of loaders) {
    mergedMessages = mergeSiteMessageDictionaries(mergedMessages, await loader());
  }

  return mergedMessages as SiteMessages;
};
