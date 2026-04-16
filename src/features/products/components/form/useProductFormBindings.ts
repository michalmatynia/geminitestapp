'use client';

import { useMemo } from 'react';
import type { UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductFormImageContextType } from '@/features/products/context/ProductFormImageContext';
import type { ProductParameterDefinition, ProductParameterValue } from '@/shared/contracts/products/parameters';
import type { ProductCustomFieldDefinition, ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type UseProductFormBindingsProps = {
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  productFormImages: ProductFormImageContextType | null;
  parameters: ProductParameterDefinition[];
  parameterValues: ProductParameterValue[];
  addParameterValue: (id: string, val: string) => void;
  updateParameterId: (oldId: string, newId: string) => void;
  updateParameterValue: (id: string, val: string) => void;
  customFields: ProductCustomFieldDefinition[];
  customFieldValues: ProductCustomFieldValue[];
  setTextValue: (id: string, val: string) => void;
  toggleSelectedOption: (id: string, optId: string) => void;
};

export function useProductFormBindings({
  getValues,
  setValue,
  productFormImages,
  parameters,
  parameterValues,
  addParameterValue,
  updateParameterId,
  updateParameterValue,
  customFields,
  customFieldValues,
  setTextValue,
  toggleSelectedOption,
}: UseProductFormBindingsProps): { supplier1688FormBindings: Supplier1688FormBindings; productFormBindings: ProductFormBindings } {
  const applyProductFormValue = <TField extends keyof ProductFormData>(
    field: TField,
    value: ProductFormData[TField]
  ): void => {
    if (typeof setValue !== 'function') return;
    setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const getCurrentProductFormValue = <TField extends keyof ProductFormData>(
    field: TField
  ): ProductFormData[TField] | undefined =>
    typeof getValues === 'function' ? getValues(field) : undefined;

  const supplier1688FormBindings: Supplier1688FormBindings = useMemo(() => ({
    getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment'): string | null => {
      const val = getCurrentProductFormValue(field);
      return typeof val === 'string' ? val : null;
    },
    applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', val: string): void => {
      applyProductFormValue(field, val);
    },
    imageLinks: productFormImages?.imageLinks,
    imageBase64s: productFormImages?.imageBase64s,
    setImageLinkAt: productFormImages?.setImageLinkAt,
    setImageBase64At: productFormImages?.setImageBase64At,
  }), [productFormImages, getValues, setValue]);

  const productFormBindings: ProductFormBindings = useMemo(() => ({
    getTextFieldValue: (field: 'asin' | 'ean' | 'gtin'): string | null => {
      const val = getCurrentProductFormValue(field);
      return typeof val === 'string' ? val : null;
    },
    getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length'): number | null => {
      const val = getCurrentProductFormValue(field);
      return typeof val === 'number' ? val : null;
    },
    applyTextField: (field: 'asin' | 'ean' | 'gtin', val: string): void => {
      applyProductFormValue(field, val);
    },
    applyNumberField: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length', val: number): void => {
      applyProductFormValue(field, val);
    },
    parameters,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    customFields,
    customFieldValues,
    setTextValue,
    toggleSelectedOption,
  }), [parameters, parameterValues, addParameterValue, updateParameterId, updateParameterValue, customFields, customFieldValues, setTextValue, toggleSelectedOption, getValues, setValue]);

  return { supplier1688FormBindings, productFormBindings };
}
