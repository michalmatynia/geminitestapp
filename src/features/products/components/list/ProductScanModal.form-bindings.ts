import { type ContextType, useContext, useMemo } from 'react';

import type { ProductScan1688FormBindings } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import type { ProductScanAmazonFormBindings } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';

type ProductScanModalFormBindings = {
  productFormBindings: ProductScanAmazonFormBindings | null;
  productSupplier1688FormBindings: ProductScan1688FormBindings | null;
};

type ProductScanModalFormContextValues = {
  productFormCoreState: ContextType<typeof ProductFormCoreStateContext>;
  productFormCoreActions: ContextType<typeof ProductFormCoreActionsContext>;
  productFormImages: ContextType<typeof ProductFormImageContext>;
  productFormParameters: ContextType<typeof ProductFormParameterContext>;
  productFormCustomFields: ContextType<typeof ProductFormCustomFieldContext>;
};

const buildAmazonProductScanFormBindings = (
  contextValues: ProductScanModalFormContextValues
): ProductScanAmazonFormBindings | null => {
  const {
    productFormCoreActions,
    productFormCoreState,
    productFormCustomFields,
    productFormParameters,
  } = contextValues;

  if (
    productFormCoreState === null ||
    productFormCoreActions === null ||
    productFormParameters === null ||
    productFormCustomFields === null
  ) {
    return null;
  }

  return {
    getTextFieldValue: (field: 'asin' | 'ean' | 'gtin'): string | null => {
      const value = productFormCoreState.getValues(field);
      return typeof value === 'string' ? value : null;
    },
    getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length'): number | null => {
      const value = productFormCoreState.getValues(field);
      return typeof value === 'number' ? value : null;
    },
    applyTextField: (field: 'asin' | 'ean' | 'gtin', value: string): void => {
      productFormCoreActions.setValue(field, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    applyNumberField: (
      field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length',
      value: number
    ): void => {
      productFormCoreActions.setValue(field, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    parameters: productFormParameters.parameters,
    parameterValues: productFormParameters.parameterValues,
    addParameterValue: productFormParameters.addParameterValue,
    updateParameterId: productFormParameters.updateParameterId,
    updateParameterValue: productFormParameters.updateParameterValue,
    customFields: productFormCustomFields.customFields,
    customFieldValues: productFormCustomFields.customFieldValues,
    setTextValue: productFormCustomFields.setTextValue,
    toggleSelectedOption: productFormCustomFields.toggleSelectedOption,
  };
};

const useAmazonProductScanFormBindings = (
  contextValues: ProductScanModalFormContextValues
): ProductScanAmazonFormBindings | null => {
  const {
    productFormCoreActions,
    productFormCoreState,
    productFormCustomFields,
    productFormParameters,
  } = contextValues;

  return useMemo(() => buildAmazonProductScanFormBindings(contextValues), [
    productFormCoreActions,
    productFormCoreState,
    productFormCustomFields,
    productFormParameters,
  ]);
};

const useSupplier1688ProductScanFormBindings = (
  contextValues: ProductScanModalFormContextValues
): ProductScan1688FormBindings | null => {
  const { productFormCoreActions, productFormCoreState, productFormImages } = contextValues;

  return useMemo((): ProductScan1688FormBindings | null => {
    if (productFormCoreState === null || productFormCoreActions === null) {
      return null;
    }

    return {
      getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment'): string | null => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'string' ? value : null;
      },
      applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', value: string): void => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      imageLinks: productFormImages?.imageLinks,
      imageBase64s: productFormImages?.imageBase64s,
      setImageLinkAt: productFormImages?.setImageLinkAt,
      setImageBase64At: productFormImages?.setImageBase64At,
    };
  }, [productFormCoreActions, productFormCoreState, productFormImages]);
};

export const useProductScanModalFormBindings = (): ProductScanModalFormBindings => {
  const contextValues = {
    productFormCoreState: useContext(ProductFormCoreStateContext),
    productFormCoreActions: useContext(ProductFormCoreActionsContext),
    productFormImages: useContext(ProductFormImageContext),
    productFormParameters: useContext(ProductFormParameterContext),
    productFormCustomFields: useContext(ProductFormCustomFieldContext),
  };

  return {
    productFormBindings: useAmazonProductScanFormBindings(contextValues),
    productSupplier1688FormBindings: useSupplier1688ProductScanFormBindings(contextValues),
  };
};
