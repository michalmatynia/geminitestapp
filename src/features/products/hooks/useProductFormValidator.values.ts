'use client';

import { useMemo } from 'react';
import type { UseFormWatch } from 'react-hook-form';

import { buildProductValidationSourceValues } from '@/features/products/lib/validatorSourceFields';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';

type UseProductFormValidatorValuesArgs = {
  categories: ProductCategory[];
  fallbackCatalogId: string;
  producers: Producer[];
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedProducerIds: string[];
  watch: UseFormWatch<ProductFormData>;
};

const WATCHED_VALIDATOR_FIELDS = [
  'name_en',
  'name_pl',
  'name_de',
  'description_en',
  'description_pl',
  'description_de',
  'sku',
  'price',
  'stock',
  'weight',
  'sizeLength',
  'sizeWidth',
  'length',
  'supplierName',
  'supplierLink',
  'priceComment',
  'categoryId',
] as const;

const buildValidatorBaseValues = (watchFields: readonly unknown[]): Record<string, unknown> => ({
  name_en: watchFields[0],
  name_pl: watchFields[1],
  name_de: watchFields[2],
  description_en: watchFields[3],
  description_pl: watchFields[4],
  description_de: watchFields[5],
  sku: watchFields[6],
  price: watchFields[7],
  stock: watchFields[8],
  weight: watchFields[9],
  sizeLength: watchFields[10],
  sizeWidth: watchFields[11],
  length: watchFields[12],
  supplierName: watchFields[13],
  supplierLink: watchFields[14],
  priceComment: watchFields[15],
  categoryId: typeof watchFields[16] === 'string' ? watchFields[16] : '',
});

export const useProductFormValidatorValues = ({
  categories,
  fallbackCatalogId,
  producers,
  selectedCatalogIds,
  selectedCategoryId,
  selectedProducerIds,
  watch,
}: UseProductFormValidatorValuesArgs): Record<string, unknown> => {
  const watchFields = watch(WATCHED_VALIDATOR_FIELDS);

  return useMemo(
    () =>
      buildProductValidationSourceValues({
        baseValues: buildValidatorBaseValues(watchFields),
        categories,
        fallbackCatalogId,
        producers,
        selectedCatalogIds,
        selectedCategoryId,
        selectedProducerIds,
      }),
    [
      categories,
      fallbackCatalogId,
      producers,
      selectedCatalogIds,
      selectedCategoryId,
      selectedProducerIds,
      watchFields,
    ]
  );
};
