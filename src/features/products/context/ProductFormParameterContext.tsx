'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';
import {
  normalizeTitleTermName,
  splitStructuredProductName,
} from '@/shared/lib/products/title-terms';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';

import { useParameters, useTitleTerms } from '../hooks/useProductMetadataQueries';
import { ProductFormCoreStateContext } from './ProductFormCoreContext';

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

type MergedParameterValuesResult = {
  values: ProductParameterValue[];
  baseIndexByValueIndex: number[];
};

const resolveStructuredLinkedTermValues = (
  value: string
): Record<ProductTitleTermType, string> => {
  const segments = splitStructuredProductName(value);
  return {
    size: segments[1] ?? '',
    material: segments[2] ?? '',
    theme: segments[4] ?? '',
  };
};

const buildTitleTermLookup = (terms: ProductTitleTerm[] | undefined): Map<string, ProductTitleTerm> => {
  const lookup = new Map<string, ProductTitleTerm>();
  (terms ?? []).forEach((term: ProductTitleTerm) => {
    const key = normalizeTitleTermName(term.name_en ?? '');
    if (!key || lookup.has(key)) return;
    lookup.set(key, term);
  });
  return lookup;
};

const resolveLinkedParameterValue = (
  parameterId: string,
  term: ProductTitleTerm
): ProductParameterValue => ({
  parameterId,
  value: term.name_en,
  valuesByLanguage: {
    en: term.name_en,
    ...(term.name_pl ? { pl: term.name_pl } : {}),
  },
});

const mergeLinkedParameterValues = ({
  baseValues,
  linkedParameterIds,
  linkedParameters,
  resolvedLinkedValuesById,
}: {
  baseValues: ProductParameterValue[];
  linkedParameterIds: Set<string>;
  linkedParameters: ProductParameter[];
  resolvedLinkedValuesById: Map<string, ProductParameterValue>;
}): MergedParameterValuesResult => {
  const nextValues: ProductParameterValue[] = [];
  const baseIndexByValueIndex: number[] = [];
  const usedLinkedParameterIds = new Set<string>();

  baseValues.forEach((entry: ProductParameterValue, baseIndex: number) => {
    const normalizedParameterId = typeof entry.parameterId === 'string' ? entry.parameterId.trim() : '';
    if (!normalizedParameterId || !linkedParameterIds.has(normalizedParameterId)) {
      nextValues.push(entry);
      baseIndexByValueIndex.push(baseIndex);
      return;
    }

    if (usedLinkedParameterIds.has(normalizedParameterId)) {
      return;
    }

    const linkedValue = resolvedLinkedValuesById.get(normalizedParameterId);
    if (linkedValue) {
      nextValues.push(linkedValue);
      baseIndexByValueIndex.push(baseIndex);
      usedLinkedParameterIds.add(normalizedParameterId);
    }
  });

  linkedParameters.forEach((parameter: ProductParameter) => {
    const linkedValue = resolvedLinkedValuesById.get(parameter.id);
    if (!linkedValue || usedLinkedParameterIds.has(parameter.id)) return;
    nextValues.push(linkedValue);
    baseIndexByValueIndex.push(-1);
    usedLinkedParameterIds.add(parameter.id);
  });

  return {
    values: nextValues,
    baseIndexByValueIndex,
  };
};

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
  const coreState = useContext(ProductFormCoreStateContext);
  const parametersQuery = useParameters(primaryCatalogId);
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
  const sourceParameterValues = useMemo(
    (): ProductParameterValue[] => normalizeSourceParameterValues(product?.parameters ?? draft?.parameters),
    [draft?.parameters, product?.parameters]
  );
  const sourceParameterValuesKey = useMemo(
    (): string => serializeParameterValues(sourceParameterValues),
    [sourceParameterValues]
  );

  const [baseParameterValues, setBaseParameterValues] = useState<ProductParameterValue[]>(
    sourceParameterValues
  );
  const adoptedParameterValuesKeyRef = useRef<string>(sourceParameterValuesKey);
  const watchedNameEn = coreState?.methods.watch('name_en');
  const currentStructuredName =
    (typeof watchedNameEn === 'string' ? watchedNameEn : null) ?? product?.name_en ?? draft?.name_en ?? '';

  useEffect(() => {
    const previousAdoptedKey = adoptedParameterValuesKeyRef.current;
    if (sourceParameterValuesKey === previousAdoptedKey) return;

    setBaseParameterValues((current: ProductParameterValue[]): ProductParameterValue[] => {
      const currentKey = serializeParameterValues(current);
      if (currentKey !== previousAdoptedKey) {
        return current;
      }
      adoptedParameterValuesKeyRef.current = sourceParameterValuesKey;
      return sourceParameterValues;
    });
  }, [sourceParameterValues, sourceParameterValuesKey]);

  const linkedParameters = useMemo(
    (): ProductParameter[] =>
      (parametersQuery.data ?? []).filter(
        (parameter: ProductParameter): boolean => Boolean(parameter.linkedTitleTermType)
      ),
    [parametersQuery.data]
  );
  const linkedParameterIds = useMemo(
    (): Set<string> => new Set(linkedParameters.map((parameter: ProductParameter) => parameter.id)),
    [linkedParameters]
  );
  const structuredLinkedTermValues = useMemo(
    (): Record<ProductTitleTermType, string> => resolveStructuredLinkedTermValues(currentStructuredName),
    [currentStructuredName]
  );
  const titleTermLookups = useMemo(
    (): Record<ProductTitleTermType, Map<string, ProductTitleTerm>> => ({
      size: buildTitleTermLookup(sizeTermsQuery.data),
      material: buildTitleTermLookup(materialTermsQuery.data),
      theme: buildTitleTermLookup(themeTermsQuery.data),
    }),
    [materialTermsQuery.data, sizeTermsQuery.data, themeTermsQuery.data]
  );
  const resolvedLinkedValuesById = useMemo((): Map<string, ProductParameterValue> => {
    const resolved = new Map<string, ProductParameterValue>();
    linkedParameters.forEach((parameter: ProductParameter) => {
      const linkedType = parameter.linkedTitleTermType;
      if (!linkedType) return;

      const rawSegmentValue = structuredLinkedTermValues[linkedType] ?? '';
      const lookupKey = normalizeTitleTermName(rawSegmentValue);
      if (!lookupKey) return;

      const matchedTerm = titleTermLookups[linkedType].get(lookupKey);
      if (!matchedTerm) return;

      resolved.set(parameter.id, resolveLinkedParameterValue(parameter.id, matchedTerm));
    });
    return resolved;
  }, [linkedParameters, structuredLinkedTermValues, titleTermLookups]);
  const mergedParameterValues = useMemo(
    (): MergedParameterValuesResult =>
      mergeLinkedParameterValues({
        baseValues: baseParameterValues,
        linkedParameterIds,
        linkedParameters,
        resolvedLinkedValuesById,
      }),
    [baseParameterValues, linkedParameterIds, linkedParameters, resolvedLinkedValuesById]
  );
  const parameterValues = mergedParameterValues.values;
  const parameterValueIndexMap = mergedParameterValues.baseIndexByValueIndex;

  const value = useMemo((): ProductFormParameterContextType => {
    const addParameterValue = (): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [
        ...prev,
        { parameterId: '', value: '' },
      ]);
    };

    const updateParameterId = (index: number, parameterId: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const baseIndex = parameterValueIndexMap[index] ?? index;
        if (baseIndex < 0) return prev;
        const next = [...prev];
        if (!next[baseIndex]) return prev;
        next[baseIndex] = { ...next[baseIndex], parameterId };
        return next;
      });
    };

    const updateParameterValue = (index: number, value: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const baseIndex = parameterValueIndexMap[index] ?? index;
        if (baseIndex < 0) return prev;
        const next = [...prev];
        if (!next[baseIndex]) return prev;
        next[baseIndex] = { ...next[baseIndex], value };
        return next;
      });
    };

    const updateParameterValueByLanguage = (
      index: number,
      languageCode: string,
      value: string
    ): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const baseIndex = parameterValueIndexMap[index] ?? index;
        if (baseIndex < 0) return prev;
        const next = [...prev];
        if (!next[baseIndex]) return prev;
        const normalizedLang = languageCode.trim().toLowerCase();
        if (!normalizedLang) return prev;
        const current = next[baseIndex];
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
        next[baseIndex] = nextEntry;
        return next;
      });
    };

    const removeParameterValue = (index: number): void => {
      onInteraction?.();
      const baseIndex = parameterValueIndexMap[index] ?? index;
      if (baseIndex < 0) return;
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] =>
        prev.filter((_: ProductParameterValue, i: number): boolean => i !== baseIndex)
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
  }, [
    onInteraction,
    parameterValueIndexMap,
    parameterValues,
    parametersQuery.data,
    parametersQuery.isLoading,
  ]);

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
