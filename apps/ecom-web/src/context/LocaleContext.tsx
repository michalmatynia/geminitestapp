'use client';

import {
  createContext,
  useCallback,
  useContext,
  type JSX,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localizeHref,
  type EcomLocale,
} from '@/lib/locales';

interface LocaleContextValue {
  locale: EcomLocale;
  pathname: string;
  search: string;
  availableLocales: EcomLocale[];
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  pathname: '/',
  search: '',
  availableLocales: [...SUPPORTED_LOCALES],
});

export function LocaleProvider({
  locale,
  pathname = '/',
  search = '',
  availableLocales = SUPPORTED_LOCALES,
  children,
}: {
  locale: EcomLocale;
  pathname?: string;
  search?: string;
  availableLocales?: readonly EcomLocale[];
  children: ReactNode;
}): JSX.Element {
  const locales = availableLocales.length > 0 ? [...availableLocales] : [...SUPPORTED_LOCALES];

  return (
    <LocaleContext.Provider value={{ locale, pathname, search, availableLocales: locales }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): EcomLocale {
  return useContext(LocaleContext).locale;
}

export function useLocaleLocation(): { pathname: string; search: string } {
  const { pathname, search } = useContext(LocaleContext);
  return { pathname, search };
}

export function useAvailableLocales(): EcomLocale[] {
  return useContext(LocaleContext).availableLocales;
}

export function useLocalizedHref(): (href: string) => string {
  const locale = useLocale();
  return useCallback((href: string) => localizeHref(href, locale), [locale]);
}
