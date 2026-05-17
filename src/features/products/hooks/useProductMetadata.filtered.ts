'use client';

import { useMemo } from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';

import type { FilteredProductMetadata } from './useProductMetadata.types';

const createNormalizedSet = (values: string[]): Set<string> =>
  new Set(values.map((value: string): string => String(value).trim().toUpperCase()));

const filterLanguagesForCatalogs = (
  languages: Language[],
  selectedCatalogs: CatalogRecord[]
): Language[] => {
  const languageIdSet = new Set(
    selectedCatalogs.flatMap((catalog: CatalogRecord): string[] => catalog.languageIds)
  );
  if (languageIdSet.size === 0) return languages;
  const normalizedLanguageSet = createNormalizedSet(Array.from(languageIdSet));
  return languages.filter((language: Language): boolean => {
    const idKey = String(language.id).trim().toUpperCase();
    const codeKey = String(language.code).trim().toUpperCase();
    return normalizedLanguageSet.has(idKey) || normalizedLanguageSet.has(codeKey);
  });
};

const filterPriceGroupsForCatalogs = (
  priceGroups: PriceGroupWithDetails[],
  selectedCatalogs: CatalogRecord[]
): PriceGroupWithDetails[] => {
  const priceGroupIds = selectedCatalogs.flatMap(
    (catalog: CatalogRecord): string[] => catalog.priceGroupIds
  );
  if (priceGroupIds.length === 0) return priceGroups;
  return priceGroups.filter((group: PriceGroupWithDetails): boolean =>
    priceGroupIds.some((identifier: string): boolean =>
      matchesPriceGroupIdentifier(group, identifier)
    )
  );
};

const resolveFilteredProductMetadata = ({
  catalogs,
  languages,
  priceGroups,
  selectedCatalogIds,
}: {
  catalogs: CatalogRecord[];
  languages: Language[];
  priceGroups: PriceGroupWithDetails[];
  selectedCatalogIds: string[];
}): FilteredProductMetadata => {
  if (selectedCatalogIds.length === 0) {
    return { filteredLanguages: languages, filteredPriceGroups: priceGroups };
  }
  const selectedCatalogs = catalogs.filter((catalog: CatalogRecord): boolean =>
    selectedCatalogIds.includes(catalog.id)
  );
  const filteredLanguages = filterLanguagesForCatalogs(languages, selectedCatalogs);
  return {
    filteredLanguages: filteredLanguages.length > 0 ? filteredLanguages : languages,
    filteredPriceGroups: filterPriceGroupsForCatalogs(priceGroups, selectedCatalogs),
  };
};

export const useFilteredProductMetadata = (input: {
  catalogs: CatalogRecord[];
  languages: Language[];
  priceGroups: PriceGroupWithDetails[];
  selectedCatalogIds: string[];
}): FilteredProductMetadata =>
  useMemo(
    (): FilteredProductMetadata => resolveFilteredProductMetadata(input),
    [input.catalogs, input.languages, input.priceGroups, input.selectedCatalogIds]
  );
