import { useEffect, useMemo, useState } from 'react';

import type { Language } from '@/shared/contracts/internationalization';

import { normalizeLanguageCode } from './ProductFormParameters.helpers';
import type { CatalogLanguageOption } from './ProductFormParameters.types';

type ProductParameterLanguageState = {
  catalogLanguages: CatalogLanguageOption[];
  languageTabValues: string[];
  firstLanguageTab: string;
  activeParameterLanguageTab: string;
  setActiveParameterLanguageTab: (value: string) => void;
  resolvedActiveParameterLanguageTab: string;
  activeParameterLanguage: CatalogLanguageOption;
  primaryLanguageCode: string;
};

const FALLBACK_LANGUAGE: CatalogLanguageOption = { code: 'default', label: 'Default' };
const DEFAULT_PARAMETER_LANGUAGES: CatalogLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polish' },
];

type ProductParameterLanguageStateInput = {
  filteredLanguages: Language[];
  catalogsLoading: boolean;
  languagesLoading: boolean;
};

const resolveLanguageLabel = (language: Language, code: string): string => {
  if (typeof language.name === 'string' && language.name.trim().length > 0) {
    return language.name.trim();
  }
  if (typeof language.nativeName === 'string' && language.nativeName.trim().length > 0) {
    return language.nativeName.trim();
  }
  return code.toUpperCase();
};

const buildCatalogLanguages = ({
  filteredLanguages,
  catalogsLoading,
  languagesLoading,
}: ProductParameterLanguageStateInput): CatalogLanguageOption[] => {
  const byCode = new Map<string, CatalogLanguageOption>();
  filteredLanguages.forEach((language: Language) => {
    const code = normalizeLanguageCode(language.code);
    if (code.length === 0 || byCode.has(code)) return;
    byCode.set(code, {
      code,
      label: resolveLanguageLabel(language, code),
    });
  });
  if (byCode.size === 0) {
    if (catalogsLoading || languagesLoading) return [FALLBACK_LANGUAGE];
    return DEFAULT_PARAMETER_LANGUAGES;
  }
  return Array.from(byCode.values());
};

const resolveActiveLanguageTab = (args: {
  activeParameterLanguageTab: string;
  firstLanguageTab: string;
  languageTabValues: string[];
}): string => {
  if (
    args.activeParameterLanguageTab.length > 0 &&
    args.languageTabValues.includes(args.activeParameterLanguageTab)
  ) {
    return args.activeParameterLanguageTab;
  }
  return args.firstLanguageTab;
};

const resolveActiveLanguage = (args: {
  catalogLanguages: CatalogLanguageOption[];
  resolvedActiveParameterLanguageTab: string;
}): CatalogLanguageOption =>
  args.catalogLanguages.find(
    (language: CatalogLanguageOption) =>
      language.code === args.resolvedActiveParameterLanguageTab
  ) ??
  args.catalogLanguages[0] ??
  FALLBACK_LANGUAGE;

export const useProductParameterLanguageState = (
  input: ProductParameterLanguageStateInput
): ProductParameterLanguageState => {
  const { filteredLanguages, catalogsLoading, languagesLoading } = input;
  const catalogLanguages = useMemo(
    (): CatalogLanguageOption[] =>
      buildCatalogLanguages({ filteredLanguages, catalogsLoading, languagesLoading }),
    [catalogsLoading, filteredLanguages, languagesLoading]
  );
  const primaryLanguageCode = catalogLanguages[0]?.code ?? FALLBACK_LANGUAGE.code;
  const languageTabValues = useMemo(
    () => catalogLanguages.map((language: CatalogLanguageOption) => language.code),
    [catalogLanguages]
  );
  const firstLanguageTab = languageTabValues[0] ?? FALLBACK_LANGUAGE.code;
  const [activeParameterLanguageTab, setActiveParameterLanguageTab] =
    useState<string>(firstLanguageTab);

  useEffect(() => {
    setActiveParameterLanguageTab((prev: string) =>
      prev.length > 0 && languageTabValues.includes(prev) ? prev : firstLanguageTab
    );
  }, [firstLanguageTab, languageTabValues]);

  const resolvedActiveParameterLanguageTab = resolveActiveLanguageTab({
    activeParameterLanguageTab,
    firstLanguageTab,
    languageTabValues,
  });
  const activeParameterLanguage = resolveActiveLanguage({
    catalogLanguages,
    resolvedActiveParameterLanguageTab,
  });

  return {
    catalogLanguages,
    languageTabValues,
    firstLanguageTab,
    activeParameterLanguageTab,
    setActiveParameterLanguageTab,
    resolvedActiveParameterLanguageTab,
    activeParameterLanguage,
    primaryLanguageCode,
  };
};
