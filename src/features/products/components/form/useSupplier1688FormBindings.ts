'use client';

import { useMemo } from 'react';
import type { UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductFormImageContextType } from '@/features/products/context/ProductFormImageContext';
import type { Supplier1688FormBindings } from './ProductFormScans.types';

type UseSupplier1688FormBindingsProps = {
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  productFormImages: ProductFormImageContextType | null;
};

export function useSupplier1688FormBindings({
  getValues,
  setValue,
  productFormImages,
}: UseSupplier1688FormBindingsProps): Supplier1688FormBindings {
  return useMemo(() => {
    const applyValue = <TField extends keyof ProductFormData>(
      field: TField,
      value: ProductFormData[TField]
    ): void => {
      if (typeof setValue !== 'function') return;
      setValue(field, value as never, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    };

    const getValue = <TField extends keyof ProductFormData>(
      field: TField
    ): ProductFormData[TField] | undefined =>
      typeof getValues === 'function' ? getValues(field) : undefined;

    return {
      getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment'): string | null => {
        const val = getValue(field);
        return typeof val === 'string' ? val : null;
      },
      applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', val: string): void => {
        applyValue(field, val);
      },
      imageLinks: productFormImages?.imageLinks,
      imageBase64s: productFormImages?.imageBase64s,
      setImageLinkAt: productFormImages?.setImageLinkAt,
      setImageBase64At: productFormImages?.setImageBase64At,
    };
  }, [productFormImages, getValues, setValue]);
}
