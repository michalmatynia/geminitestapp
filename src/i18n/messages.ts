import 'server-only';

import { cache } from 'react';

import type enMessages from './messages/en.json';
import plMessages from './messages/pl.json';

import {
  getDefaultSiteLocaleCode,
  getLocaleFallbackChain,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

export type SiteMessages = typeof enMessages;

type SiteMessageValue =
  | string
  | number
  | boolean
  | null
  | SiteMessageValue[]
  | { [key: string]: SiteMessageValue };

type SiteMessageDictionary = { [key: string]: SiteMessageValue };

const repairBundledPolishMessages = (
  messages: SiteMessageDictionary
): SiteMessageDictionary =>
  Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      key.startsWith('Kangur') ? repairKangurPolishCopy(value) : value,
    ])
  );

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

const repairedBundledPolishMessages = repairBundledPolishMessages(
  plMessages as SiteMessageDictionary
);

const KANGUR_MESSAGE_ROOT_ALLOWLIST = new Set<string>(['Common']);

const defaultMessageLoader = async () => repairedBundledPolishMessages;

const messageLoaders: Partial<Record<string, () => Promise<SiteMessageDictionary>>> = {
  pl: async () => repairedBundledPolishMessages,
  en: () => import('./messages/en.json').then((module) => module.default as SiteMessageDictionary),
  de: () => import('./messages/de.json').then((module) => module.default as SiteMessageDictionary),
  uk: () => import('./messages/uk.json').then((module) => module.default as SiteMessageDictionary),
};

const isKangurMessageRoot = (key: string): boolean =>
  key.startsWith('Kangur') || KANGUR_MESSAGE_ROOT_ALLOWLIST.has(key);

const filterScopedSiteMessages = (
  messages: SiteMessageDictionary,
  predicate: (key: string) => boolean
): SiteMessageDictionary =>
  Object.fromEntries(Object.entries(messages).filter(([key]) => predicate(key)));

export const loadSiteMessages = cache(
  async (locale: string | null | undefined): Promise<SiteMessages> => {
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
        messageLoaders[getDefaultSiteLocaleCode()] ?? messageLoaders['en'] ?? defaultMessageLoader;
      return (await fallbackLoader()) as SiteMessages;
    }

    let mergedMessages: SiteMessageDictionary = {};

    for (const loader of loaders) {
      mergedMessages = mergeSiteMessageDictionaries(mergedMessages, await loader());
    }

    return mergedMessages as SiteMessages;
  }
);

export const loadKangurSiteMessages = cache(
  async (locale: string | null | undefined): Promise<SiteMessages> =>
    filterScopedSiteMessages(await loadSiteMessages(locale), isKangurMessageRoot) as SiteMessages
);
