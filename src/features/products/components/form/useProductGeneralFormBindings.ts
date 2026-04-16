'use client';

import { useMemo } from 'react';
import type { UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductCustomFieldDefinition, ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductFormBindings } from './ProductFormScans.types';

type UseProductGeneralFormBindingsProps = {
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  parameters: ProductParameter[];
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  customFields: ProductCustomFieldDefinition[];
  customFieldValues: ProductCustomFieldValue[];
  setTextValue: (id: string, val: string) => void;
  toggleSelectedOption: (id: string, optId: string, checked: boolean) => void;
};

export function useProductGeneralFormBindings({
  getValues,
  setValue,
  parameters,
  parameterValues,
  addParameterValue,
  updateParameterId,
  updateParameterValue,
  customFields,
  customFieldValues,
  setTextValue,
  toggleSelectedOption,
}: UseProductGeneralFormBindingsProps): ProductFormBindings {
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
      getTextFieldValue: (field: 'asin' | 'ean' | 'gtin'): string | null => {
        const val = getValue(field);
        return typeof val === 'string' ? val : null;
      },
      getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length'): number | null => {
        const val = getValue(field);
        return typeof val === 'number' ? val : null;
      },
      applyTextField: (field: 'asin' | 'ean' | 'gtin', val: string): void => {
        applyValue(field, val);
      },
      applyNumberField: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length', val: number): void => {
        applyValue(field, val);
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
    };
  }, [parameters, parameterValues, addParameterValue, updateParameterId, updateParameterValue, customFields, customFieldValues, setTextValue, toggleSelectedOption, getValues, setValue]);
}
