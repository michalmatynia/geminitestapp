'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import { useStructuredProductCategorySync } from '@/features/products/components/form/useStructuredProductCategorySync';
import {
  useStructuredProductNameSuggestions,
  type StructuredProductNameSuggestionsController,
} from '@/features/products/components/form/useStructuredProductNameSuggestions';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import { useDraftCreatorMetadata } from './DraftCreatorFormContext';
import {
  DraftStructuredInputControl,
  DraftStructuredInputHints,
  type DraftPlaceholderController,
} from './DraftStructuredProductNameInput.parts';

type DraftStructuredProductNameInputProps = {
  id?: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  placeholderDropdownEnabled: boolean;
};

type TextControlElement = HTMLInputElement;
type DraftStructuredCategoryState = {
  categoryController: ReturnType<typeof useStructuredProductCategorySync>;
  primaryCatalogId: string;
  selectedCategoryLabel: string | null;
  setSelectedCategoryId: (nextId: string | null) => void;
  setStructuredValue: UseFormSetValue<ProductFormData>;
};

const insertPlaceholderToken = (
  value: string,
  token: string,
  cursorPosition: number
): { nextValue: string; nextCursor: number } => {
  const replaceStart = value.slice(0, cursorPosition).endsWith('[')
    ? cursorPosition - 1
    : cursorPosition;
  const insertion = `[${token}]`;
  return {
    nextValue: `${value.slice(0, replaceStart)}${insertion}${value.slice(cursorPosition)}`,
    nextCursor: replaceStart + insertion.length,
  };
};

function useDraftStructuredCategoryState({
  value,
  onValueChange,
}: Pick<
  DraftStructuredProductNameInputProps,
  'value' | 'onValueChange'
>): DraftStructuredCategoryState {
  const { categories, selectedCatalogIds, selectedCategoryId, setSelectedCategoryId } =
    useDraftCreatorMetadata();
  const primaryCatalogId = selectedCatalogIds[0] ?? '';
  const setStructuredValue = useCallback<UseFormSetValue<ProductFormData>>(
    (fieldName, nextValue) => {
      if (fieldName !== 'name_en') return;
      onValueChange(typeof nextValue === 'string' ? nextValue : String(nextValue ?? ''));
    },
    [onValueChange]
  );
  const getStructuredValue = useCallback(
    ((fieldName: keyof ProductFormData) => {
      if (fieldName === 'categoryId') return selectedCategoryId ?? '';
      if (fieldName === 'name_en') return value;
      return undefined;
    }) as UseFormGetValues<ProductFormData>,
    [selectedCategoryId, value]
  );
  const categoryController = useStructuredProductCategorySync({
    categories,
    fieldName: 'name_en',
    getValues: getStructuredValue,
    locale: 'en',
    nameValue: value,
    selectedCategoryId,
    setCategoryId: setSelectedCategoryId,
    setValue: setStructuredValue,
  });
  const selectedCategoryLabel = useMemo(
    () => categoryController.selectedCategoryOption?.label ?? null,
    [categoryController.selectedCategoryOption]
  );

  return {
    categoryController,
    primaryCatalogId,
    selectedCategoryLabel,
    setSelectedCategoryId,
    setStructuredValue,
  };
}

function useDraftStructuredSuggestionController({
  categoryState,
  inputRef,
  listboxId,
  value,
  onValueChange,
}: {
  categoryState: DraftStructuredCategoryState;
  inputRef: React.MutableRefObject<TextControlElement | null>;
  listboxId: string;
} & Pick<
  DraftStructuredProductNameInputProps,
  'value' | 'onValueChange'
>): StructuredProductNameSuggestionsController {
  const sizeTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'theme');

  return useStructuredProductNameSuggestions({
    categorySuggestions: categoryState.categoryController.categorySuggestions,
    fieldName: 'name_en',
    inputRef,
    listboxId,
    locale: 'en',
    materialTerms: materialTermsQuery.data ?? [],
    nameValue: value,
    primaryCatalogId: categoryState.primaryCatalogId,
    setCategoryId: categoryState.setSelectedCategoryId,
    setNormalizeNameError: () => {},
    setValue: categoryState.setStructuredValue,
    sizeTerms: sizeTermsQuery.data ?? [],
    syncMappedCategoryField: categoryState.categoryController.syncMappedCategoryField,
    themeTerms: themeTermsQuery.data ?? [],
    onFieldBlur: () => {},
    onFieldChange: (event) => {
      onValueChange(event.target.value);
    },
  });
}

function useDraftPlaceholderController({
  inputRef,
  placeholderDropdownEnabled,
  suggestionController,
  value,
  onValueChange,
}: {
  inputRef: React.MutableRefObject<TextControlElement | null>;
  suggestionController: StructuredProductNameSuggestionsController;
} & Pick<
  DraftStructuredProductNameInputProps,
  'placeholderDropdownEnabled' | 'value' | 'onValueChange'
>): DraftPlaceholderController {
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const handleKeyDown = (event: React.KeyboardEvent<TextControlElement>): void => {
    if (placeholderDropdownEnabled && event.key === '[') {
      window.setTimeout(() => setPlaceholderOpen(true), 0);
    }
    if (event.key === 'Escape') setPlaceholderOpen(false);
    if (placeholderOpen) return;
    suggestionController.onKeyDown(event);
  };
  const handleSelectPlaceholder = (key: string): void => {
    const element = inputRef.current;
    const cursorPosition = element?.selectionStart ?? value.length;
    const { nextValue, nextCursor } = insertPlaceholderToken(value, key, cursorPosition);
    onValueChange(nextValue);
    setPlaceholderOpen(false);
    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input === null) return;
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ']' }));
    });
  };

  return { handleKeyDown, handleSelectPlaceholder, placeholderOpen };
}

export function DraftStructuredProductNameInput({
  id,
  value,
  onValueChange,
  placeholder,
  title,
  ariaLabel,
  placeholderDropdownEnabled,
}: DraftStructuredProductNameInputProps): React.JSX.Element {
  const inputRef = useRef<TextControlElement | null>(null);
  const listboxId = useId();
  const categoryState = useDraftStructuredCategoryState({ value, onValueChange });
  const suggestionController = useDraftStructuredSuggestionController({
    categoryState,
    inputRef,
    listboxId,
    onValueChange,
    value,
  });
  const placeholderController = useDraftPlaceholderController({
    inputRef,
    placeholderDropdownEnabled,
    suggestionController,
    onValueChange,
    value,
  });

  return (
    <div className='space-y-1.5'>
      <DraftStructuredInputControl
        id={id}
        value={value}
        placeholder={placeholder}
        title={title}
        ariaLabel={ariaLabel}
        placeholderDropdownEnabled={placeholderDropdownEnabled}
        inputRef={inputRef}
        listboxId={listboxId}
        placeholderController={placeholderController}
        suggestionController={suggestionController}
      />
      <DraftStructuredInputHints
        primaryCatalogId={categoryState.primaryCatalogId}
        selectedCategoryLabel={categoryState.selectedCategoryLabel}
      />
    </div>
  );
}
