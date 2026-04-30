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

import {
  CLOSED_PLACEHOLDER_MENU,
  insertPlaceholderToken,
  resolvePlaceholderMenuState,
  type DraftPlaceholderMenuState,
} from './DraftPlaceholderDropdown';
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

const updatePlaceholderMenuFromInput = (
  inputRef: React.MutableRefObject<TextControlElement | null>,
  updatePlaceholderMenu: (nextValue: string, cursorPosition: number | null) => void
): void => {
  const input = inputRef.current;
  if (input !== null) updatePlaceholderMenu(input.value, input.selectionStart);
};

const focusStructuredInputAt = (
  inputRef: React.MutableRefObject<TextControlElement | null>,
  cursorPosition: number
): void => {
  window.requestAnimationFrame(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.focus();
    input.setSelectionRange(cursorPosition, cursorPosition);
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ']' }));
  });
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
  const sizeTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'size', {
    allowWithoutCatalog: true,
  });
  const materialTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'material', {
    allowWithoutCatalog: true,
  });
  const themeTermsQuery = useTitleTerms(categoryState.primaryCatalogId, 'theme', {
    allowWithoutCatalog: true,
  });

  return useStructuredProductNameSuggestions({
    categorySuggestions: categoryState.categoryController.categorySuggestions,
    fieldName: 'name_en',
    inputRef,
    listboxId,
    locale: 'en',
    materialTerms: materialTermsQuery.data ?? [],
    nameValue: value,
    primaryCatalogId: categoryState.primaryCatalogId,
    requireCatalogForSuggestions: false,
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
  const [placeholderMenu, setPlaceholderMenu] =
    useState<DraftPlaceholderMenuState>(CLOSED_PLACEHOLDER_MENU);

  const updatePlaceholderMenu = (nextValue: string, cursorPosition: number | null): void =>
    setPlaceholderMenu(
      resolvePlaceholderMenuState({
        cursorPosition,
        enabled: placeholderDropdownEnabled,
        value: nextValue,
      })
    );

  const updateFromCurrentInput = (): void =>
    updatePlaceholderMenuFromInput(inputRef, updatePlaceholderMenu);

  const handleKeyDown = (event: React.KeyboardEvent<TextControlElement>): void => {
    if (placeholderDropdownEnabled && event.key === '[') {
      window.setTimeout(updateFromCurrentInput, 0);
    }
    if (event.key === 'Escape') setPlaceholderMenu(CLOSED_PLACEHOLDER_MENU);
    if (placeholderMenu.open) return;
    suggestionController.onKeyDown(event);
  };

  const handleInputChange = (event: React.ChangeEvent<TextControlElement>): void => {
    updatePlaceholderMenu(event.target.value, event.target.selectionStart);
  };

  const handleSelectPlaceholder = (key: string): void => {
    const cursorPosition = inputRef.current?.selectionStart ?? value.length;
    const { nextValue, nextCursor } = insertPlaceholderToken(value, key, cursorPosition);
    onValueChange(nextValue);
    setPlaceholderMenu(CLOSED_PLACEHOLDER_MENU);
    focusStructuredInputAt(inputRef, nextCursor);
  };

  return {
    handleClick: updateFromCurrentInput,
    handleFocus: updateFromCurrentInput,
    handleInputChange,
    handleKeyDown,
    handleKeyUp: updateFromCurrentInput,
    handleSelectPlaceholder,
    placeholderOpen: placeholderMenu.open,
    placeholderQuery: placeholderMenu.query,
  };
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
        selectedCategoryLabel={categoryState.selectedCategoryLabel}
      />
    </div>
  );
}
