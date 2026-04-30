'use client';

import type React from 'react';

import { ProductTitleSuggestionPanel } from '@/features/products/components/form/ProductTitleSuggestionPanel';
import type { StructuredProductNameSuggestionsController } from '@/features/products/components/form/useStructuredProductNameSuggestions';
import { SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS } from '@/shared/contracts/products/scrape-template-placeholders';
import { Input } from '@/shared/ui/primitives.public';

export type DraftPlaceholderController = {
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSelectPlaceholder: (key: string) => void;
  placeholderOpen: boolean;
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
  controller,
  listboxId,
}: {
  controller: StructuredProductNameSuggestionsController;
  listboxId: string;
}): React.JSX.Element | null {
  if (controller.dropdownOpen === false) return null;
  return (
    <ProductTitleSuggestionPanel
      listboxId={listboxId}
      listboxLabel={controller.listboxLabel}
      suggestions={controller.suggestions}
      highlightedIndex={controller.highlightedIndex}
      onApply={controller.onApplySuggestion}
      onHighlight={controller.onHighlightSuggestion}
    />
  );
}

function DraftPlaceholderDropdown({
  enabled,
  open,
  onSelect,
}: {
  enabled: boolean;
  open: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element | null {
  if (enabled === false || open === false) return null;
  return (
    <div
      className='absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg'
      onMouseDown={(event): void => event.preventDefault()}
    >
      {SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS.map((option) => (
        <button
          key={option.key}
          type='button'
          className='flex w-full flex-col rounded px-2 py-1.5 text-left text-xs hover:bg-muted'
          onClick={(): void => onSelect(option.key)}
        >
          <span className='font-mono text-foreground'>[{option.key}]</span>
          <span className='text-muted-foreground'>{option.description}</span>
        </button>
      ))}
    </div>
  );
}

export function DraftStructuredInputHints({
  primaryCatalogId,
  selectedCategoryLabel,
}: {
  primaryCatalogId: string;
  selectedCategoryLabel: string | null;
}): React.JSX.Element {
  return (
    <>
      {primaryCatalogId.length === 0 ? (
        <p className='text-[10px] italic leading-relaxed text-gray-500'>
          Select a catalog first to load size, material, category, and theme suggestions.
        </p>
      ) : null}
      {selectedCategoryLabel !== null ? (
        <p className='text-[10px] italic leading-relaxed text-gray-500'>
          Selected category: {selectedCategoryLabel}
        </p>
      ) : null}
    </>
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
      <Input
        ref={inputRef}
        id={id}
        name='name_en'
        value={value}
        onChange={suggestionController.onChange}
        onFocus={suggestionController.onFocus}
        onClick={suggestionController.onClick}
        onKeyUp={suggestionController.onKeyUp}
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
      <DraftStructuredSuggestionDropdown controller={suggestionController} listboxId={listboxId} />
      <DraftPlaceholderDropdown
        enabled={placeholderDropdownEnabled}
        open={placeholderController.placeholderOpen}
        onSelect={placeholderController.handleSelectPlaceholder}
      />
    </div>
  );
}
