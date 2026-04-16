'use client';

import type { UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductFormImageContextType } from '@/features/products/context/ProductFormImageContext';
import type { ProductParameterDefinition, ProductParameterValue } from '@/shared/contracts/products/parameters';
import type { ProductCustomFieldDefinition, ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';
import { useSupplier1688FormBindings } from './useSupplier1688FormBindings';
import { useProductGeneralFormBindings } from './useProductGeneralFormBindings';

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

export function useProductFormBindings(props: UseProductFormBindingsProps): { supplier1688FormBindings: Supplier1688FormBindings; productFormBindings: ProductFormBindings } {
  const supplier1688FormBindings = useSupplier1688FormBindings({
    getValues: props.getValues,
    setValue: props.setValue,
    productFormImages: props.productFormImages,
  });

  const productFormBindings = useProductGeneralFormBindings({
    getValues: props.getValues,
    setValue: props.setValue,
    parameters: props.parameters,
    parameterValues: props.parameterValues,
    addParameterValue: props.addParameterValue,
    updateParameterId: props.updateParameterId,
    updateParameterValue: props.updateParameterValue,
    customFields: props.customFields,
    customFieldValues: props.customFieldValues,
    setTextValue: props.setTextValue,
    toggleSelectedOption: props.toggleSelectedOption,
  });

  return { supplier1688FormBindings, productFormBindings };
}
