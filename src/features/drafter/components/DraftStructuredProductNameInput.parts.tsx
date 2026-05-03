'use client';

import type React from 'react';

import { ProductTitleSuggestionPanel } from '@/features/products/components/form/ProductTitleSuggestionPanel';
import type { StructuredProductNameSuggestionsController } from '@/features/products/components/form/useStructuredProductNameSuggestions';
import { Input } from '@/shared/ui/primitives.public';

import {
  DraftPlaceholderDropdown as DraftPlaceholderDropdownPortal,
  type DraftPlaceholderAnchorElement,
} from './DraftPlaceholderDropdown';

export type DraftPlaceholderController = {
  handleClick: () => void;
  handleFocus: () => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleKeyUp: () => void;
  handleSelectPlaceholder: (key: string) => void;
  placeholderOpen: boolean;
  placeholderQuery: string;
};

type DraftStructuredInputControlProps = {
  ariaLabel?: string;
  id?: string;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  listboxId: string;
  placeholder?: string;
  placeholderController: DraftPlaceholderController;
  placeholderDropdownEnabled: boolean;
  suggestionController: StructuredProductNameSuggestionsController;
  title?: string;
  value: string;
};

function DraftStructuredSuggestionDropdown({
  anchorRef,
  controller,
  listboxId,
}: {
  anchorRef: React.MutableRefObject<HTMLInputElement | null>;
  controller: StructuredProductNameSuggestionsController;
  listboxId: string;
}): React.JSX.Element | null {
  if (controller.dropdownOpen === false) return null;
  return (
    <ProductTitleSuggestionPanel
      anchorRef={anchorRef}
      listboxId={listboxId}
      listboxLabel={controller.listboxLabel}
      suggestions={controller.suggestions}
      highlightedIndex={controller.highlightedIndex}
      onApply={controller.onApplySuggestion}
      onHighlight={controller.onHighlightSuggestion}
    />
  );
}

function DraftStructuredPlaceholderDropdown({
  anchorRef,
  enabled,
  open,
  query,
  onSelect,
}: {
  anchorRef: React.MutableRefObject<HTMLInputElement | null>;
  enabled: boolean;
  open: boolean;
  query: string;
  onSelect: (key: string) => void;
}): React.JSX.Element | null {
  if (enabled === false || open === false) return null;
  return (
    <DraftPlaceholderDropdownPortal
      anchorRef={anchorRef as React.MutableRefObject<DraftPlaceholderAnchorElement | null>}
      open={open}
      query={query}
      onSelect={onSelect}
    />
  );
}

export function DraftStructuredInputHints({
  selectedCategoryLabel,
}: {
  selectedCategoryLabel: string | null;
}): React.JSX.Element {
  return (
    <>
      {selectedCategoryLabel !== null ? (
        <p className='text-[10px] italic leading-relaxed text-gray-500'>
          Selected category: {selectedCategoryLabel}
        </p>
      ) : null}
    </>
  );
}

function DraftStructuredInputElement({
  ariaLabel,
  id,
  inputRef,
  listboxId,
  placeholder,
  placeholderController,
  suggestionController,
  title,
  value,
}: Omit<DraftStructuredInputControlProps, 'placeholderDropdownEnabled'>): React.JSX.Element {
  return (
    <Input
      ref={inputRef}
      id={id}
      name='name_en'
      value={value}
      onChange={(event): void => {
        suggestionController.onChange(event);
        placeholderController.handleInputChange(event);
      }}
      onFocus={(): void => {
        suggestionController.onFocus();
        placeholderController.handleFocus();
      }}
      onClick={(event): void => {
        suggestionController.onClick(event);
        placeholderController.handleClick();
      }}
      onKeyUp={(event): void => {
        suggestionController.onKeyUp(event);
        placeholderController.handleKeyUp();
      }}
      onKeyDown={placeholderController.handleKeyDown}
      onBlur={suggestionController.onBlur}
      placeholder={placeholder}
      title={title}
      aria-label={ariaLabel ?? placeholder}
      autoComplete='off'
      autoCorrect='off'
      autoCapitalize='off'
      aria-autocomplete='list'
      aria-controls={suggestionController.dropdownOpen ? listboxId : undefined}
      aria-activedescendant={suggestionController.activeDescendantId}
      spellCheck={false}
    />
  );
}

export function DraftStructuredInputControl({
  id,
  value,
  placeholder,
  title,
  ariaLabel,
  placeholderDropdownEnabled,
  inputRef,
  listboxId,
  placeholderController,
  suggestionController,
}: DraftStructuredInputControlProps): React.JSX.Element {
  const expanded = suggestionController.dropdownOpen || placeholderController.placeholderOpen;

  return (
    <div
      className='relative'
      role='combobox'
      aria-haspopup='listbox'
      aria-expanded={expanded}
      aria-owns={suggestionController.dropdownOpen ? listboxId : undefined}
      aria-controls={suggestionController.dropdownOpen ? listboxId : undefined}
    >
      <DraftStructuredInputElement
        id={id}
        value={value}
        placeholder={placeholder}
        title={title}
        ariaLabel={ariaLabel}
        inputRef={inputRef}
        listboxId={listboxId}
        placeholderController={placeholderController}
        suggestionController={suggestionController}
      />
      <DraftStructuredSuggestionDropdown
        anchorRef={inputRef}
        controller={suggestionController}
        listboxId={listboxId}
      />
      <DraftStructuredPlaceholderDropdown
        anchorRef={inputRef}
        enabled={placeholderDropdownEnabled}
        open={placeholderController.placeholderOpen}
        query={placeholderController.placeholderQuery}
        onSelect={placeholderController.handleSelectPlaceholder}
      />
    </div>
  );
}
