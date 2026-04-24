'use client';

// ProductFormParameterContext: manages product parameter (spec/attribute)
// state and helpers. Exposes parameter lists per-catalog and normalization
// utilities used by parameter input components.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
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

export interface ProductFormParameterContextType {
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  applyLocalizedParameterValues: (
    updates: Array<{ parameterId: string; languageCode: string; value: string }>
  ) => void;
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
  | 'applyLocalizedParameterValues'
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

const normalizeEditableParameterValuesByLanguage = (
  input: unknown
): Record<string, string> => {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>)
    .map(([languageCode, rawValue]: [string, unknown]): [string, string] | null => {
      const normalizedLanguageCode = languageCode.trim().toLowerCase();
      if (
        normalizedLanguageCode.length === 0 ||
        typeof rawValue !== 'string' ||
        rawValue.length === 0
      ) {
        return null;
      }
      return [normalizedLanguageCode, rawValue];
    })
    .filter((entry: [string, string] | null): entry is [string, string] => entry !== null);

  return Object.fromEntries(entries);
};

const resolveEditableParameterValue = (
  valuesByLanguage: Record<string, string>,
  directValue: string | null | undefined = ''
): string => {
  const normalizedDirectValue = typeof directValue === 'string' ? directValue : '';
  const defaultValue = valuesByLanguage['default'];
  if (typeof defaultValue === 'string' && defaultValue.length > 0) return defaultValue;

  const localizedValues = Object.values(valuesByLanguage);
  if (localizedValues.length === 0) return normalizedDirectValue;

  return normalizedDirectValue.length > 0 && localizedValues.includes(normalizedDirectValue)
    ? normalizedDirectValue
    : '';
};

const resolveNextEditableScalarCandidate = ({
  currentScalarValue,
  previousLocalizedValue,
  hadLocalizedValues,
  nextLocalizedValue,
}: {
  currentScalarValue: string;
  previousLocalizedValue: string;
  hadLocalizedValues: boolean;
  nextLocalizedValue: string;
}): string => {
  if (currentScalarValue.length === 0) return currentScalarValue;
  if (currentScalarValue === previousLocalizedValue) return nextLocalizedValue;
  if (!hadLocalizedValues) return nextLocalizedValue;
  return currentScalarValue;
};

const applyEditableLocalizedValue = (
  currentValues: Record<string, string>,
  languageCode: string,
  nextValue: string
): Record<string, string> => {
  if (nextValue.length > 0) {
    return { ...currentValues, [languageCode]: nextValue };
  }

  return Object.fromEntries(
    Object.entries(currentValues).filter(
      ([entryLanguageCode]: [string, string]): boolean => entryLanguageCode !== languageCode
    )
  );
};

const resolveEditableLocalizedParameterEntry = ({
  current,
  languageCode,
  nextValue,
}: {
  current: ProductParameterValue;
  languageCode: string;
  nextValue: string;
}): ProductParameterValue | null => {
  const normalizedLang = languageCode.trim().toLowerCase();
  if (normalizedLang.length === 0) return null;

  const currentValues = normalizeEditableParameterValuesByLanguage(current.valuesByLanguage);
  const hadLocalizedValues = Object.keys(currentValues).length > 0;
  const previousLocalizedValue = currentValues[normalizedLang] ?? '';
  const nextValues = applyEditableLocalizedValue(currentValues, normalizedLang, nextValue);
  const currentScalarValue = typeof current.value === 'string' ? current.value : '';
  const nextScalarCandidate = resolveNextEditableScalarCandidate({
    currentScalarValue,
    previousLocalizedValue,
    hadLocalizedValues,
    nextLocalizedValue: nextValue,
  });
  const nextPrimaryValue = resolveEditableParameterValue(nextValues, nextScalarCandidate);
  const nextEntry: ProductParameterValue = {
    ...current,
    value: nextPrimaryValue,
  };

  if (Object.keys(nextValues).length > 0) {
    return { ...nextEntry, valuesByLanguage: nextValues };
  }

  return {
    parameterId: nextEntry.parameterId,
    value: nextEntry.value,
  };
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
    pl: term.name_pl || term.name_en,
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
  const formContext = useFormContext<ProductFormData>();
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
  const watchedNameEn = useWatch({
    control: formContext?.control,
    name: 'name_en',
    disabled: !formContext?.control,
  });
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

    const applyLocalizedParameterValues = (
      updates: Array<{ parameterId: string; languageCode: string; value: string }>
    ): void => {
      const normalizedUpdates = updates
        .map((entry) => ({
          parameterId: decodeSimpleParameterStorageId(
            typeof entry.parameterId === 'string' ? entry.parameterId : ''
          ),
          languageCode:
            typeof entry.languageCode === 'string' ? entry.languageCode.trim().toLowerCase() : '',
          value: typeof entry.value === 'string' ? entry.value.trim() : '',
        }))
        .filter(
          (entry): entry is { parameterId: string; languageCode: string; value: string } =>
            entry.parameterId.length > 0 && entry.languageCode.length > 0 && entry.value.length > 0
        );
      if (normalizedUpdates.length === 0) return;

      const updateByParameterId = new Map<
        string,
        { parameterId: string; languageCode: string; value: string }
      >();
      normalizedUpdates.forEach((entry) => {
        updateByParameterId.set(entry.parameterId, entry);
      });

      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        let changed = false;
        const next = prev.map((current: ProductParameterValue): ProductParameterValue => {
          const normalizedParameterId = decodeSimpleParameterStorageId(
            typeof current.parameterId === 'string' ? current.parameterId : ''
          );
          const match = updateByParameterId.get(normalizedParameterId);
          if (!match) return current;

          const currentValues = normalizeParameterValuesByLanguage(current.valuesByLanguage);
          const previousLocalizedValue = currentValues[match.languageCode] ?? '';
          if (previousLocalizedValue === match.value) {
            return current;
          }

          const nextValues = {
            ...currentValues,
            [match.languageCode]: match.value,
          };
          const currentScalarValue = typeof current.value === 'string' ? current.value.trim() : '';
          const nextScalarValue =
            currentScalarValue && currentScalarValue !== previousLocalizedValue
              ? currentScalarValue
              : match.value;

          changed = true;
          return {
            ...current,
            parameterId: normalizedParameterId,
            value: nextScalarValue,
            valuesByLanguage: nextValues,
          };
        });

        return changed ? next : prev;
      });
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

    const updateParameterValue = (index: number, nextValue: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const baseIndex = parameterValueIndexMap[index] ?? index;
        if (baseIndex < 0) return prev;
        const next = [...prev];
        if (!next[baseIndex]) return prev;
        next[baseIndex] = { ...next[baseIndex], value: nextValue };
        return next;
      });
    };

    const updateParameterValueByLanguage = (
      index: number,
      languageCode: string,
      nextValue: string
    ): void => {
      onInteraction?.();
      setBaseParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
        const baseIndex = parameterValueIndexMap[index] ?? index;
        if (baseIndex < 0) return prev;
        const next = [...prev];
        const current = next[baseIndex];
        if (current === undefined) return prev;
        const nextEntry = resolveEditableLocalizedParameterEntry({
          current,
          languageCode,
          nextValue,
        });
        if (nextEntry === null) return prev;
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
      applyLocalizedParameterValues,
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
    applyLocalizedParameterValues,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    removeParameterValue,
  } = useRequiredProductFormParameterContext();
  return {
    addParameterValue,
    applyLocalizedParameterValues,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    removeParameterValue,
  };
};

export const useProductFormParameters = (): ProductFormParameterContextType =>
  useRequiredProductFormParameterContext();
