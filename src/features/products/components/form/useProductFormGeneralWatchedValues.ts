'use client';

import { useMemo } from 'react';
import type { UseFormWatch } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

import type {
  ProductFormGeneralDisplayValues,
  ProductFormGeneralWatchedValues,
} from './ProductFormGeneral.types';

const WATCHED_GENERAL_FIELD_NAMES = [
  'name_en',
  'name_pl',
  'name_de',
  'description_en',
  'description_pl',
  'description_de',
  'sku',
  'weight',
  'sizeLength',
  'sizeWidth',
  'length',
  'supplierName',
  'supplierLink',
  'priceComment',
  'price',
  'stock',
] as const;

const buildWatchedValues = (
  values: readonly unknown[]
): ProductFormGeneralWatchedValues => ({
  nameEn: values[0],
  namePl: values[1],
  nameDe: values[2],
  descEn: values[3],
  descPl: values[4],
  descDe: values[5],
  sku: values[6],
  weight: values[7],
  sizeLength: values[8],
  sizeWidth: values[9],
  fieldLength: values[10],
  supplierName: values[11],
  supplierLink: values[12],
  priceComment: values[13],
  price: values[14],
  stock: values[15],
});

const buildDisplayValues = (
  watchedValues: ProductFormGeneralWatchedValues
): ProductFormGeneralDisplayValues => ({
  name_en: watchedValues.nameEn,
  name_pl: watchedValues.namePl,
  name_de: watchedValues.nameDe,
  description_en: watchedValues.descEn,
  description_pl: watchedValues.descPl,
  description_de: watchedValues.descDe,
  sku: watchedValues.sku,
  weight: watchedValues.weight,
  sizeLength: watchedValues.sizeLength,
  sizeWidth: watchedValues.sizeWidth,
  length: watchedValues.fieldLength,
  supplierName: watchedValues.supplierName,
  supplierLink: watchedValues.supplierLink,
  priceComment: watchedValues.priceComment,
  price: watchedValues.price,
  stock: watchedValues.stock,
});

export const useProductFormGeneralWatchedValues = (
  watch: UseFormWatch<ProductFormData>
): {
  watchedValues: ProductFormGeneralWatchedValues;
  displayValues: ProductFormGeneralDisplayValues;
} => {
  const watchedRawValues = watch(WATCHED_GENERAL_FIELD_NAMES);
  const watchedValues = useMemo(
    () => buildWatchedValues(watchedRawValues),
    [watchedRawValues]
  );
  const displayValues = useMemo(() => buildDisplayValues(watchedValues), [watchedValues]);
  return { watchedValues, displayValues };
};
