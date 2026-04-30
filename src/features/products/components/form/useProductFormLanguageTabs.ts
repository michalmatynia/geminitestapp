'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ProductFormLanguage } from './ProductFormGeneral.types';

export type ProductFormLanguageTabsState = {
  languageTabValues: string[];
  resolvedActiveNameTab: string;
  resolvedActiveDescriptionTab: string;
  setActiveNameTab: (value: string) => void;
  setActiveDescriptionTab: (value: string) => void;
};

const normalizeLanguageCode = (language: Pick<ProductFormLanguage, 'code'>): string =>
  String(language.code).trim().toLowerCase();

const resolveActiveTab = (activeTab: string, firstLanguageTab: string): string =>
  activeTab !== '' ? activeTab : firstLanguageTab;

const resolveNextActiveTab = (
  previous: string,
  firstLanguageTab: string,
  languageTabValues: string[]
): string => {
  if (firstLanguageTab === '') return '';
  if (previous !== '' && languageTabValues.includes(previous)) return previous;
  return firstLanguageTab;
};

export const useProductFormLanguageTabs = (
  filteredLanguages: ProductFormLanguage[]
): ProductFormLanguageTabsState => {
  const [activeNameTab, setActiveNameTab] = useState<string>('');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState<string>('');
  const languageTabValues = useMemo(
    () => filteredLanguages.map((language) => normalizeLanguageCode(language)),
    [filteredLanguages]
  );
  const firstLanguageTab = languageTabValues[0] ?? '';

  useEffect(() => {
    setActiveNameTab((previous) =>
      resolveNextActiveTab(previous, firstLanguageTab, languageTabValues)
    );
    setActiveDescriptionTab((previous) =>
      resolveNextActiveTab(previous, firstLanguageTab, languageTabValues)
    );
  }, [firstLanguageTab, languageTabValues]);

  return {
    languageTabValues,
    resolvedActiveNameTab: resolveActiveTab(activeNameTab, firstLanguageTab),
    resolvedActiveDescriptionTab: resolveActiveTab(activeDescriptionTab, firstLanguageTab),
    setActiveNameTab,
    setActiveDescriptionTab,
  };
};
