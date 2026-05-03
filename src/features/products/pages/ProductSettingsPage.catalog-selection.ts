'use client';

import { useEffect, useState } from 'react';

import type { Catalog } from '@/shared/contracts/products/catalogs';

type CatalogSelectionSetter = (catalogId: string | null) => void;

type CatalogSelectionUpdateArgs = {
  isActive: boolean;
  selectedCatalogId: string | null;
  setSelectedCatalogId: CatalogSelectionSetter;
  defaultCatalogId: string | null;
};

type CatalogSelectionScheduleArgs = ProductSettingsCatalogSelectionState & {
  catalogs: Catalog[];
  shouldLoadCatalogs: boolean;
  isCategoriesSectionActive: boolean;
  isShippingGroupsSectionActive: boolean;
  isTagsSectionActive: boolean;
  isParametersSectionActive: boolean;
};

export type ProductSettingsCatalogSelectionState = {
  selectedCategoryCatalogId: string | null;
  setSelectedCategoryCatalogId: CatalogSelectionSetter;
  selectedShippingGroupCatalogId: string | null;
  setSelectedShippingGroupCatalogId: CatalogSelectionSetter;
  selectedTagCatalogId: string | null;
  setSelectedTagCatalogId: CatalogSelectionSetter;
  selectedParameterCatalogId: string | null;
  setSelectedParameterCatalogId: CatalogSelectionSetter;
};

const hasSelectedCatalogId = (value: string | null): boolean =>
  value !== null && value.trim().length > 0;

const resolveDefaultCatalogId = (catalogs: Catalog[]): string | null => {
  const defaultCatalog = catalogs.find((catalog) => catalog.isDefault) ?? catalogs[0] ?? null;
  return defaultCatalog?.id ?? null;
};

const applyDefaultCatalogSelection = (args: CatalogSelectionUpdateArgs): void => {
  if (
    args.isActive === false ||
    hasSelectedCatalogId(args.selectedCatalogId) ||
    args.defaultCatalogId === null
  ) {
    return;
  }
  args.setSelectedCatalogId(args.defaultCatalogId);
};

const scheduleDefaultCatalogSelections = (
  args: CatalogSelectionScheduleArgs
): ReturnType<typeof setTimeout> | null => {
  const defaultCatalogId = resolveDefaultCatalogId(args.catalogs);
  if (args.shouldLoadCatalogs === false || defaultCatalogId === null) return null;

  return setTimeout(() => {
    applyDefaultCatalogSelection({
      isActive: args.isCategoriesSectionActive,
      selectedCatalogId: args.selectedCategoryCatalogId,
      setSelectedCatalogId: args.setSelectedCategoryCatalogId,
      defaultCatalogId,
    });
    applyDefaultCatalogSelection({
      isActive: args.isShippingGroupsSectionActive,
      selectedCatalogId: args.selectedShippingGroupCatalogId,
      setSelectedCatalogId: args.setSelectedShippingGroupCatalogId,
      defaultCatalogId,
    });
    applyDefaultCatalogSelection({
      isActive: args.isTagsSectionActive,
      selectedCatalogId: args.selectedTagCatalogId,
      setSelectedCatalogId: args.setSelectedTagCatalogId,
      defaultCatalogId,
    });
    applyDefaultCatalogSelection({
      isActive: args.isParametersSectionActive,
      selectedCatalogId: args.selectedParameterCatalogId,
      setSelectedCatalogId: args.setSelectedParameterCatalogId,
      defaultCatalogId,
    });
  }, 0);
};

export const useProductSettingsCatalogSelectionState = (): ProductSettingsCatalogSelectionState => {
  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedShippingGroupCatalogId, setSelectedShippingGroupCatalogId] = useState<
    string | null
  >(null);
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);
  const [selectedParameterCatalogId, setSelectedParameterCatalogId] = useState<string | null>(null);

  return {
    selectedCategoryCatalogId,
    setSelectedCategoryCatalogId,
    selectedShippingGroupCatalogId,
    setSelectedShippingGroupCatalogId,
    selectedTagCatalogId,
    setSelectedTagCatalogId,
    selectedParameterCatalogId,
    setSelectedParameterCatalogId,
  };
};

export const useProductSettingsDefaultCatalogSelections = (
  args: CatalogSelectionScheduleArgs
): void => {
  useEffect(() => {
    const timer = scheduleDefaultCatalogSelections(args);
    return (): void => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [
    args.catalogs,
    args.isCategoriesSectionActive,
    args.isParametersSectionActive,
    args.isShippingGroupsSectionActive,
    args.isTagsSectionActive,
    args.shouldLoadCatalogs,
    args.selectedCategoryCatalogId,
    args.selectedParameterCatalogId,
    args.selectedShippingGroupCatalogId,
    args.selectedTagCatalogId,
    args.setSelectedCategoryCatalogId,
    args.setSelectedParameterCatalogId,
    args.setSelectedShippingGroupCatalogId,
    args.setSelectedTagCatalogId,
  ]);
};
