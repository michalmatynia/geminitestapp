'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';
import {
  filterProductCustomFieldValuesByDefinitions,
  normalizeProductCustomFieldSelectedOptionIds,
  normalizeProductCustomFieldValues,
} from '@/shared/lib/products/utils/custom-field-values';

import { useCustomFields } from '../hooks/useProductMetadataQueries';

export interface ProductFormCustomFieldContextType {
  customFields: ProductCustomFieldDefinition[];
  customFieldsLoading: boolean;
  customFieldValues: ProductCustomFieldValue[];
  setTextValue: (fieldId: string, value: string) => void;
  toggleSelectedOption: (fieldId: string, optionId: string, checked: boolean) => void;
}

export type ProductFormCustomFieldStateContextType = Pick<
  ProductFormCustomFieldContextType,
  'customFields' | 'customFieldsLoading' | 'customFieldValues'
>;

export type ProductFormCustomFieldActionsContextType = Pick<
  ProductFormCustomFieldContextType,
  'setTextValue' | 'toggleSelectedOption'
>;

export const ProductFormCustomFieldContext =
  createContext<ProductFormCustomFieldContextType | null>(null);

const serializeCustomFieldValues = (value: ProductCustomFieldValue[]): string =>
  JSON.stringify(normalizeProductCustomFieldValues(value));

const replaceCustomFieldValue = (
  values: ProductCustomFieldValue[],
  nextEntry: ProductCustomFieldValue
): ProductCustomFieldValue[] => {
  const index = values.findIndex((entry: ProductCustomFieldValue) => entry.fieldId === nextEntry.fieldId);
  if (index === -1) {
    return [...values, nextEntry];
  }

  const next = [...values];
  next[index] = nextEntry;
  return next;
};

export function ProductFormCustomFieldProvider({
  children,
  product,
  draft,
  onInteraction,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onInteraction?: () => void;
}) {
  const customFieldsQuery = useCustomFields();
  const resolvedDefinitions = customFieldsQuery.data;
  const sourceCustomFieldValues = useMemo(
    (): ProductCustomFieldValue[] =>
      Array.isArray(resolvedDefinitions)
        ? filterProductCustomFieldValuesByDefinitions(
            product?.customFields ?? draft?.customFields,
            resolvedDefinitions
          )
        : normalizeProductCustomFieldValues(product?.customFields ?? draft?.customFields),
    [draft?.customFields, product?.customFields, resolvedDefinitions]
  );
  const sourceCustomFieldValuesKey = useMemo(
    (): string => serializeCustomFieldValues(sourceCustomFieldValues),
    [sourceCustomFieldValues]
  );

  const [customFieldValues, setCustomFieldValues] =
    useState<ProductCustomFieldValue[]>(sourceCustomFieldValues);
  const adoptedCustomFieldValuesKeyRef = useRef<string>(sourceCustomFieldValuesKey);

  useEffect(() => {
    const previousAdoptedKey = adoptedCustomFieldValuesKeyRef.current;
    if (sourceCustomFieldValuesKey === previousAdoptedKey) return;

    setCustomFieldValues((current: ProductCustomFieldValue[]): ProductCustomFieldValue[] => {
      const currentKey = serializeCustomFieldValues(current);
      if (currentKey !== previousAdoptedKey) {
        return current;
      }
      adoptedCustomFieldValuesKeyRef.current = sourceCustomFieldValuesKey;
      return sourceCustomFieldValues;
    });
  }, [sourceCustomFieldValues, sourceCustomFieldValuesKey]);

  useEffect(() => {
    if (!Array.isArray(resolvedDefinitions)) return;

    setCustomFieldValues((current: ProductCustomFieldValue[]): ProductCustomFieldValue[] => {
      const filtered = filterProductCustomFieldValuesByDefinitions(current, resolvedDefinitions);
      const currentKey = serializeCustomFieldValues(current);
      const filteredKey = serializeCustomFieldValues(filtered);
      if (currentKey === filteredKey) {
        return current;
      }
      return filtered;
    });
  }, [resolvedDefinitions]);

  const value = useMemo((): ProductFormCustomFieldContextType => {
    const setTextValue = (fieldId: string, value: string): void => {
      const normalizedFieldId = fieldId.trim();
      if (!normalizedFieldId) return;

      onInteraction?.();
      setCustomFieldValues((prev: ProductCustomFieldValue[]): ProductCustomFieldValue[] => {
        const existing = prev.find((entry: ProductCustomFieldValue) => entry.fieldId === normalizedFieldId);
        const nextValue = value.trim();

        if (!existing && nextValue.length === 0) {
          return prev;
        }

        return replaceCustomFieldValue(prev, {
          fieldId: normalizedFieldId,
          textValue: nextValue.length > 0 ? value : '',
        });
      });
    };

    const toggleSelectedOption = (fieldId: string, optionId: string, checked: boolean): void => {
      const normalizedFieldId = fieldId.trim();
      const normalizedOptionId = optionId.trim();
      if (!normalizedFieldId || !normalizedOptionId) return;

      onInteraction?.();
      setCustomFieldValues((prev: ProductCustomFieldValue[]): ProductCustomFieldValue[] => {
        const existing = prev.find((entry: ProductCustomFieldValue) => entry.fieldId === normalizedFieldId);
        const currentOptionIds = normalizeProductCustomFieldSelectedOptionIds(
          existing?.selectedOptionIds ?? []
        );
        const nextOptionIds = checked
          ? [...currentOptionIds, normalizedOptionId]
          : currentOptionIds.filter((id: string): boolean => id !== normalizedOptionId);
        const normalizedOptionIds = normalizeProductCustomFieldSelectedOptionIds(nextOptionIds);

        if (!existing && normalizedOptionIds.length === 0) {
          return prev;
        }

        return replaceCustomFieldValue(prev, {
          fieldId: normalizedFieldId,
          selectedOptionIds: normalizedOptionIds,
        });
      });
    };

    return {
      customFields: customFieldsQuery.data || [],
      customFieldsLoading: customFieldsQuery.isLoading,
      customFieldValues,
      setTextValue,
      toggleSelectedOption,
    };
  }, [customFieldsQuery.data, customFieldsQuery.isLoading, customFieldValues, onInteraction]);

  return (
    <ProductFormCustomFieldContext.Provider value={value}>
      {children}
    </ProductFormCustomFieldContext.Provider>
  );
}

const useRequiredProductFormCustomFieldContext = (): ProductFormCustomFieldContextType => {
  const context = useContext(ProductFormCustomFieldContext);
  if (!context) {
    throw internalError(
      'useProductFormCustomFields must be used within a ProductFormCustomFieldProvider'
    );
  }
  return context;
};

export const useProductFormCustomFieldState = (): ProductFormCustomFieldStateContextType => {
  const { customFields, customFieldsLoading, customFieldValues } =
    useRequiredProductFormCustomFieldContext();
  return {
    customFields,
    customFieldsLoading,
    customFieldValues,
  };
};

export const useProductFormCustomFieldActions = (): ProductFormCustomFieldActionsContextType => {
  const { setTextValue, toggleSelectedOption } = useRequiredProductFormCustomFieldContext();
  return {
    setTextValue,
    toggleSelectedOption,
  };
};

export const useProductFormCustomFields = (): ProductFormCustomFieldContextType =>
  useRequiredProductFormCustomFieldContext();
