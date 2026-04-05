'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';

import { useParameters } from '../hooks/useProductMetadataQueries';

export interface ProductFormParameterContextType {
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  updateParameterValueByLanguage: (index: number, languageCode: string, value: string) => void;
  removeParameterValue: (index: number) => void;
}

export type ProductFormParameterStateContextType = Pick<
  ProductFormParameterContextType,
  'parameters' | 'parametersLoading' | 'parameterValues'
>;

export type ProductFormParameterActionsContextType = Pick<
  ProductFormParameterContextType,
  | 'addParameterValue'
  | 'updateParameterId'
  | 'updateParameterValue'
  | 'updateParameterValueByLanguage'
  | 'removeParameterValue'
>;

export const ProductFormParameterContext = createContext<ProductFormParameterContextType | null>(
  null
);

export const resolvePrimaryParameterValue = (
  valuesByLanguage: Record<string, string>,
  fallbackValue: string = ''
): string => resolveStoredParameterValue(valuesByLanguage, fallbackValue);

const normalizeSourceParameterValues = (
  sourceParams: ProductParameterValue[] | null | undefined
): ProductParameterValue[] => {
  if (!Array.isArray(sourceParams)) return [];

  return sourceParams.map((entry: ProductParameterValue) => {
    const valuesByLanguage = normalizeParameterValuesByLanguage(entry?.valuesByLanguage);
    const directValue = typeof entry?.value === 'string' ? entry.value : '';
    const fallbackValue = resolveStoredParameterValue(valuesByLanguage, directValue);

    return {
      parameterId: decodeSimpleParameterStorageId(
        typeof entry?.parameterId === 'string' ? entry.parameterId : ''
      ),
      value: fallbackValue,
      ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    };
  });
};

const serializeParameterValues = (value: ProductParameterValue[]): string => JSON.stringify(value);

export function ProductFormParameterProvider({
  children,
  product,
  draft,
  selectedCatalogIds,
  onInteraction,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  selectedCatalogIds: string[];
  onInteraction?: () => void;
}) {
  const primaryCatalogId = selectedCatalogIds[0] || '';
  const parametersQuery = useParameters(primaryCatalogId);
  const sourceParameterValues = useMemo(
    (): ProductParameterValue[] => normalizeSourceParameterValues(product?.parameters ?? draft?.parameters),
    [draft?.parameters, product?.parameters]
  );
  const sourceParameterValuesKey = useMemo(
    (): string => serializeParameterValues(sourceParameterValues),
    [sourceParameterValues]
  );

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(sourceParameterValues);
  const adoptedParameterValuesKeyRef = useRef<string>(sourceParameterValuesKey);

  useEffect(() => {
    const previousAdoptedKey = adoptedParameterValuesKeyRef.current;
    if (sourceParameterValuesKey === previousAdoptedKey) return;

    setParameterValues((current: ProductParameterValue[]): ProductParameterValue[] => {
      const currentKey = serializeParameterValues(current);
      if (currentKey !== previousAdoptedKey) {
        return current;
      }
      adoptedParameterValuesKeyRef.current = sourceParameterValuesKey;
      return sourceParameterValues;
    });
  }, [sourceParameterValues, sourceParameterValuesKey]);

  const value = useMemo((): ProductFormParameterContextType => {
    const addParameterValue = (): void => {
      onInteraction?.();
      setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [
        ...prev,
        { parameterId: '', value: '' },
      ]);
    };

    const updateParameterId = (index: number, parameterId: string): void => {
      onInteraction?.();
      setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const next = [...prev];
        if (!next[index]) return prev;
        next[index] = { ...next[index], parameterId };
        return next;
      });
    };

    const updateParameterValue = (index: number, value: string): void => {
      onInteraction?.();
      setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const next = [...prev];
        if (!next[index]) return prev;
        next[index] = { ...next[index], value };
        return next;
      });
    };

    const updateParameterValueByLanguage = (
      index: number,
      languageCode: string,
      value: string
    ): void => {
      onInteraction?.();
      setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const next = [...prev];
        if (!next[index]) return prev;
        const normalizedLang = languageCode.trim().toLowerCase();
        if (!normalizedLang) return prev;
        const current = next[index];
        const currentValues = normalizeParameterValuesByLanguage(current.valuesByLanguage);
        const hadLocalizedValues = Object.keys(currentValues).length > 0;
        const previousLocalizedValue = currentValues[normalizedLang] ?? '';
        const normalizedValue = value.trim();
        if (normalizedValue.length > 0) {
          currentValues[normalizedLang] = normalizedValue;
        } else {
          delete currentValues[normalizedLang];
        }
        const currentScalarValue = typeof current.value === 'string' ? current.value.trim() : '';
        const nextScalarCandidate =
          currentScalarValue && currentScalarValue === previousLocalizedValue
            ? normalizedValue
            : !hadLocalizedValues && currentScalarValue
              ? normalizedValue
              : currentScalarValue;
        const nextPrimaryValue = resolveStoredParameterValue(currentValues, nextScalarCandidate);
        const nextEntry: ProductParameterValue = {
          ...current,
          value: nextPrimaryValue,
        };
        if (Object.keys(currentValues).length > 0) {
          nextEntry.valuesByLanguage = currentValues;
        } else {
          delete nextEntry.valuesByLanguage;
        }
        next[index] = nextEntry;
        return next;
      });
    };

    const removeParameterValue = (index: number): void => {
      onInteraction?.();
      setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] =>
        prev.filter((_: ProductParameterValue, i: number): boolean => i !== index)
      );
    };

    return {
      parameters: parametersQuery.data || [],
      parametersLoading: parametersQuery.isLoading,
      parameterValues,
      addParameterValue,
      updateParameterId,
      updateParameterValue,
      updateParameterValueByLanguage,
      removeParameterValue,
    };
  }, [parametersQuery.data, parametersQuery.isLoading, parameterValues, onInteraction]);

  return (
    <ProductFormParameterContext.Provider value={value}>
      {children}
    </ProductFormParameterContext.Provider>
  );
}

const useRequiredProductFormParameterContext = (): ProductFormParameterContextType => {
  const context = useContext(ProductFormParameterContext);
  if (!context) {
    throw internalError(
      'useProductFormParameters must be used within a ProductFormParameterProvider'
    );
  }
  return context;
};

export const useProductFormParameterState = (): ProductFormParameterStateContextType => {
  const { parameters, parametersLoading, parameterValues } = useRequiredProductFormParameterContext();
  return {
    parameters,
    parametersLoading,
    parameterValues,
  };
};

export const useProductFormParameterActions = (): ProductFormParameterActionsContextType => {
  const {
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    removeParameterValue,
  } = useRequiredProductFormParameterContext();
  return {
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    removeParameterValue,
  };
};

export const useProductFormParameters = (): ProductFormParameterContextType =>
  useRequiredProductFormParameterContext();
