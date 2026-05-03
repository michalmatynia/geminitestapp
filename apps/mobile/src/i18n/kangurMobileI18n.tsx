import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

export type KangurMobileLocale = 'pl' | 'en' | 'de';

export type KangurMobileLocalizedValue<T> = Record<KangurMobileLocale, T>;

type KangurMobileI18nContextValue = {
  locale: KangurMobileLocale;
  localeTag: string;
};

const KANGUR_MOBILE_LOCALE_TAGS: Record<KangurMobileLocale, string> = {
  de: 'de-DE',
  en: 'en-US',
  pl: 'pl-PL',
};

const DEFAULT_KANGUR_MOBILE_I18N_CONTEXT: KangurMobileI18nContextValue = {
  locale: 'pl',
  localeTag: KANGUR_MOBILE_LOCALE_TAGS.pl,
};

const KangurMobileI18nContext = createContext<KangurMobileI18nContextValue>(
  DEFAULT_KANGUR_MOBILE_I18N_CONTEXT,
);

export const normalizeKangurMobileLocale = (
  value: string | null | undefined,
): KangurMobileLocale => {
  const normalized = value?.trim().toLowerCase() ?? '';

  if (normalized === '') {
    return 'pl';
  }

  if (normalized === 'de' || normalized.startsWith('de-')) {
    return 'de';
  }

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }

  return 'pl';
};

export const getKangurMobileLocaleTag = (
  locale: KangurMobileLocale,
): string => KANGUR_MOBILE_LOCALE_TAGS[locale];

export const getKangurMobileLocalizedValue = <T,>(
  value: KangurMobileLocalizedValue<T>,
  locale: KangurMobileLocale,
): T => value[locale];

const resolveKangurMobileRuntimeLocale = (): KangurMobileLocale => {
  const navigatorLocale =
    typeof navigator === 'undefined' ? null : navigator.language;
  const intlLocale =
    typeof Intl === 'undefined'
      ? null
      : Intl.DateTimeFormat().resolvedOptions().locale;

  return normalizeKangurMobileLocale(navigatorLocale ?? intlLocale);
};

export function KangurMobileI18nProvider({
  children,
  locale,
}: PropsWithChildren<{
  locale?: string | null;
}>): React.JSX.Element {
  const [resolvedLocale] = useState<KangurMobileLocale>(() => {
    const explicitLocale = locale?.trim() ?? '';

    if (explicitLocale !== '') {
      return normalizeKangurMobileLocale(explicitLocale);
    }

    return resolveKangurMobileRuntimeLocale();
  });

  return (
    <KangurMobileI18nContext.Provider
      value={{
        locale: resolvedLocale,
        localeTag: getKangurMobileLocaleTag(resolvedLocale),
      }}
    >
      {children}
    </KangurMobileI18nContext.Provider>
  );
}

export type KangurMobileCopy = <T>(value: KangurMobileLocalizedValue<T>) => T;

export const useKangurMobileI18n = (): KangurMobileI18nContextValue & {
  copy: KangurMobileCopy;
} => {
  const context = useContext(KangurMobileI18nContext);

  return {
    ...context,
    copy: <T,>(value: KangurMobileLocalizedValue<T>): T =>
      getKangurMobileLocalizedValue(value, context.locale),
  };
};
