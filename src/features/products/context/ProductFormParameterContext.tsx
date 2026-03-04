'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import type {
  ProductParameter,
  ProductParameterValue,
  ProductWithImages,
  ProductDraft,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

import { useParameters } from '../hooks/useProductMetadataQueries';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';

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

export const ProductFormParameterContext = createContext<ProductFormParameterContextType | null>(
  null
);

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

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(() => {
    const sourceParams = product?.parameters ?? draft?.parameters;
    if (!Array.isArray(sourceParams)) return [];

    return sourceParams.map((entry: ProductParameterValue) => {
      const valuesByLanguage =
        entry?.valuesByLanguage &&
        typeof entry.valuesByLanguage === 'object' &&
        !Array.isArray(entry.valuesByLanguage)
          ? Object.entries(entry.valuesByLanguage).reduce(
              (acc: Record<string, string>, [lang, rawValue]: [string, unknown]) => {
                const normalizedLang = lang.trim().toLowerCase();
                if (!normalizedLang) return acc;
                const normalizedValue = typeof rawValue === 'string' ? rawValue : '';
                acc[normalizedLang] = normalizedValue;
                return acc;
              },
              {} as Record<string, string>
            )
          : {};
      const directValue = typeof entry?.value === 'string' ? entry.value : '';
      const fallbackValue =
        directValue ||
        valuesByLanguage['default'] ||
        valuesByLanguage['en'] ||
        Object.values(valuesByLanguage).find(
          (value: string): boolean => typeof value === 'string' && value.length > 0
        ) ||
        '';

      return {
        parameterId: decodeSimpleParameterStorageId(
          typeof entry?.parameterId === 'string' ? entry.parameterId : ''
        ),
        value: fallbackValue,
        ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
      };
    });
  });

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
        const currentValues =
          current.valuesByLanguage &&
          typeof current.valuesByLanguage === 'object' &&
          !Array.isArray(current.valuesByLanguage)
            ? { ...current.valuesByLanguage }
            : {};
        currentValues[normalizedLang] = value;
        next[index] = {
          ...current,
          valuesByLanguage: currentValues,
        };
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

export const useProductFormParameters = (): ProductFormParameterContextType => {
  const context = useContext(ProductFormParameterContext);
  if (!context) {
    throw internalError(
      'useProductFormParameters must be used within a ProductFormParameterProvider'
    );
  }
  return context;
};
