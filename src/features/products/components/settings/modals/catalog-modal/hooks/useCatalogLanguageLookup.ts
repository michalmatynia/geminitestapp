import React from 'react';

import type { Language } from '@/shared/contracts/internationalization';

type CatalogLanguageLookup = {
  languageIdByAnyValue: Map<string, string>;
  canonicalizeLanguageId: (value: string) => string;
  getLanguage: (value: string) => Language | undefined;
};

const addLanguageLookupValue = (map: Map<string, string>, value: string, id: string): void => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return;
  map.set(trimmed, id);
  map.set(trimmed.toLowerCase(), id);
};

const buildLanguageLookupMap = (languages: Language[]): Map<string, string> => {
  const map = new Map<string, string>();
  languages.forEach((language) => {
    const id = language.id.trim();
    addLanguageLookupValue(map, id, id);
    addLanguageLookupValue(map, language.code, id);
  });
  return map;
};

export function useCatalogLanguageLookup(languages: Language[]): CatalogLanguageLookup {
  const languageIdByAnyValue = React.useMemo(() => buildLanguageLookupMap(languages), [languages]);

  const canonicalizeLanguageId = React.useCallback(
    (value: string): string => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return '';
      return (
        languageIdByAnyValue.get(trimmed) ??
        languageIdByAnyValue.get(trimmed.toLowerCase()) ??
        trimmed
      );
    },
    [languageIdByAnyValue]
  );

  const getLanguage = React.useCallback(
    (value: string): Language | undefined => {
      const canonicalId = canonicalizeLanguageId(value);
      return languages.find((language) => language.id === canonicalId);
    },
    [canonicalizeLanguageId, languages]
  );

  return {
    languageIdByAnyValue,
    canonicalizeLanguageId,
    getLanguage,
  };
}
