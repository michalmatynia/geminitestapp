'use client';

import { useEffect, useMemo } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  PRICE_GROUP_SOURCE_PRICE_FIELD,
  type CatalogRecord,
} from '@/shared/contracts/products/catalogs';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import {
  findPriceGroupByIdentifier,
  resolvePriceGroupIdentifierToId,
} from '@/shared/lib/products/utils/price-group-identifiers';
import {
  calculatePriceForCurrency,
  normalizeCurrencyCode,
} from '@/shared/lib/products/utils/priceCalculation';

export interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

export type ProductFormOtherPricingSectionProps = {
  hasCatalogs: boolean;
  isNewProduct: boolean;
  catalogs: CatalogRecord[];
  selectedCatalogIds: string[];
  basePrice: number;
  sourcePrice: number | null;
  selectedDefaultPriceGroupId: string;
  filteredPriceGroups: PriceGroupWithDetails[];
  setValue: UseFormSetValue<ProductFormData>;
};

const hasPriceMultiplierSource = (group: PriceGroupWithDetails): boolean =>
  ((typeof group.sourceGroupId === 'string' && group.sourceGroupId.trim() !== '') ||
    group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) &&
  typeof group.priceMultiplier === 'number' &&
  Number.isFinite(group.priceMultiplier);

export const resolvePriceGroupCurrencyCode = (group: PriceGroupWithDetails): string => {
  const currency = (group as { currency?: { code?: unknown } }).currency;
  return typeof currency?.code === 'string' ? currency.code : group.currencyCode;
};

const buildBasePriceGroupPrice = (
  group: PriceGroupWithDetails,
  basePrice: number,
  selectedDefaultPriceGroupId: string
): PriceGroupWithCalculatedPrice => ({
  ...group,
  calculatedPrice: group.id === selectedDefaultPriceGroupId ? basePrice : null,
  isCalculated: false,
  sourceGroupName: undefined,
});

const buildCalculatedPriceGroupPrice = (
  group: PriceGroupWithDetails,
  calculatedPrice: number | null,
  sourceGroupName: string | undefined
): PriceGroupWithCalculatedPrice => ({
  ...group,
  calculatedPrice,
  isCalculated: true,
  sourceGroupName,
});

const resolvePriceGroupSourceName = (
  group: PriceGroupWithDetails,
  priceGroups: PriceGroupWithDetails[]
): string | undefined => {
  if (group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) return 'Source price';
  if (typeof group.sourceGroupId !== 'string' || group.sourceGroupId.trim() === '') {
    return undefined;
  }
  return findPriceGroupByIdentifier(priceGroups, group.sourceGroupId)?.name;
};

const resolveCalculatedPriceForGroup = ({
  basePrice,
  group,
  priceGroups,
  selectedDefaultPriceGroupId,
  sourcePrice,
}: {
  basePrice: number;
  group: PriceGroupWithDetails;
  priceGroups: PriceGroupWithDetails[];
  selectedDefaultPriceGroupId: string;
  sourcePrice: number | null;
}): number | null => {
  const targetCurrencyCode = resolvePriceGroupCurrencyCode(group);
  const result = calculatePriceForCurrency(
    basePrice,
    selectedDefaultPriceGroupId,
    targetCurrencyCode,
    priceGroups,
    { sourcePrice }
  );
  return normalizeCurrencyCode(result.currencyCode) === normalizeCurrencyCode(targetCurrencyCode)
    ? result.price
    : null;
};

export const buildPriceGroupPrices = ({
  filteredPriceGroups,
  selectedDefaultPriceGroupId,
  basePrice,
  sourcePrice,
}: Pick<
  ProductFormOtherPricingSectionProps,
  'filteredPriceGroups' | 'selectedDefaultPriceGroupId' | 'basePrice' | 'sourcePrice'
>): PriceGroupWithCalculatedPrice[] =>
  filteredPriceGroups.map((group) => {
    if (hasPriceMultiplierSource(group) === false) {
      return buildBasePriceGroupPrice(group, basePrice, selectedDefaultPriceGroupId);
    }
    return buildCalculatedPriceGroupPrice(
      group,
      resolveCalculatedPriceForGroup({
        basePrice,
        group,
        priceGroups: filteredPriceGroups,
        selectedDefaultPriceGroupId,
        sourcePrice,
      }),
      resolvePriceGroupSourceName(group, filteredPriceGroups)
    );
  });

const buildPriceGroupOptions = (
  filteredPriceGroups: PriceGroupWithDetails[]
): Array<LabeledOptionDto<string>> =>
  filteredPriceGroups.map((group) => ({
    value: group.id,
    label: `${group.name}${group.isDefault ? ' (Default)' : ''} (${resolvePriceGroupCurrencyCode(group)})`,
  }));

const resolveCanonicalPriceGroupId = (
  priceGroups: PriceGroupWithDetails[],
  priceGroupId: string | null | undefined
): string => resolvePriceGroupIdentifierToId(priceGroups, priceGroupId).trim();

const resolveCatalogDefaultPriceGroupId = (
  catalog: CatalogRecord | undefined,
  priceGroups: PriceGroupWithDetails[]
): string => {
  if (typeof catalog?.defaultPriceGroupId !== 'string') return '';
  return resolveCanonicalPriceGroupId(priceGroups, catalog.defaultPriceGroupId);
};

const hasPriceGroupOption = (
  options: Array<LabeledOptionDto<string>>,
  priceGroupId: string
): boolean => options.some((option) => option.value === priceGroupId);

type PriceGroupSelectionState = {
  canUseCatalogDefault: boolean;
  catalogDefaultPriceGroupId: string;
  normalizedSelectedPriceGroupId: string;
  selectedOptionValue: string;
};

const buildPriceGroupSelectionState = ({
  catalogs,
  filteredPriceGroups,
  isNewProduct,
  priceGroupOptions,
  selectedCatalogIds,
  selectedDefaultPriceGroupId,
}: Pick<
  ProductFormOtherPricingSectionProps,
  'catalogs' | 'filteredPriceGroups' | 'isNewProduct' | 'selectedCatalogIds' | 'selectedDefaultPriceGroupId'
> & {
  priceGroupOptions: Array<LabeledOptionDto<string>>;
}): PriceGroupSelectionState => {
  const selectedCatalog = catalogs.find((catalog) => selectedCatalogIds.includes(catalog.id));
  const catalogDefaultPriceGroupId = resolveCatalogDefaultPriceGroupId(
    selectedCatalog,
    filteredPriceGroups
  );
  const normalizedSelectedPriceGroupId = selectedDefaultPriceGroupId.trim();
  const selectedPriceGroupId = resolveCanonicalPriceGroupId(
    filteredPriceGroups,
    normalizedSelectedPriceGroupId
  );
  const selectedOptionValue = hasPriceGroupOption(priceGroupOptions, selectedPriceGroupId)
    ? selectedPriceGroupId
    : '';
  const canUseCatalogDefault =
    isNewProduct &&
    catalogDefaultPriceGroupId !== '' &&
    hasPriceGroupOption(priceGroupOptions, catalogDefaultPriceGroupId);

  return {
    canUseCatalogDefault,
    catalogDefaultPriceGroupId,
    normalizedSelectedPriceGroupId,
    selectedOptionValue,
  };
};

const useCanonicalPriceGroupValueSync = ({
  normalizedSelectedPriceGroupId,
  selectedOptionValue,
  setValue,
}: Pick<PriceGroupSelectionState, 'normalizedSelectedPriceGroupId' | 'selectedOptionValue'> & {
  setValue: UseFormSetValue<ProductFormData>;
}): void => {
  useEffect(() => {
    if (
      normalizedSelectedPriceGroupId === '' ||
      selectedOptionValue === '' ||
      normalizedSelectedPriceGroupId === selectedOptionValue
    ) {
      return;
    }
    setValue('defaultPriceGroupId', selectedOptionValue, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [normalizedSelectedPriceGroupId, selectedOptionValue, setValue]);
};

const useCatalogDefaultPriceGroupSync = ({
  canUseCatalogDefault,
  catalogDefaultPriceGroupId,
  selectedOptionValue,
  setValue,
}: Pick<
  PriceGroupSelectionState,
  'canUseCatalogDefault' | 'catalogDefaultPriceGroupId' | 'selectedOptionValue'
> & {
  setValue: UseFormSetValue<ProductFormData>;
}): void => {
  useEffect(() => {
    if (!canUseCatalogDefault || selectedOptionValue !== '') return;
    setValue('defaultPriceGroupId', catalogDefaultPriceGroupId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [canUseCatalogDefault, catalogDefaultPriceGroupId, selectedOptionValue, setValue]);
};

export const useCatalogDefaultPriceGroupSelection = ({
  catalogs,
  filteredPriceGroups,
  isNewProduct,
  selectedCatalogIds,
  selectedDefaultPriceGroupId,
  setValue,
}: Pick<
  ProductFormOtherPricingSectionProps,
  | 'catalogs'
  | 'filteredPriceGroups'
  | 'isNewProduct'
  | 'selectedCatalogIds'
  | 'selectedDefaultPriceGroupId'
  | 'setValue'
>): {
  isPriceGroupAutoSelected: boolean;
  priceGroupOptions: Array<LabeledOptionDto<string>>;
  selectedPriceGroupId: string;
} => {
  const priceGroupOptions = useMemo(
    () => buildPriceGroupOptions(filteredPriceGroups),
    [filteredPriceGroups]
  );
  const selectionState = buildPriceGroupSelectionState({
    catalogs,
    filteredPriceGroups,
    isNewProduct,
    priceGroupOptions,
    selectedCatalogIds,
    selectedDefaultPriceGroupId,
  });

  useCanonicalPriceGroupValueSync({ ...selectionState, setValue });
  useCatalogDefaultPriceGroupSync({ ...selectionState, setValue });

  return {
    isPriceGroupAutoSelected:
      selectionState.canUseCatalogDefault &&
      selectionState.selectedOptionValue === selectionState.catalogDefaultPriceGroupId,
    priceGroupOptions,
    selectedPriceGroupId: selectionState.selectedOptionValue,
  };
};
