'use client';

import { BookType } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils/ui-utils';

import { ProductTitleSuggestionPanel } from './ProductTitleSuggestionPanel';
import type { StructuredProductNameFieldProps } from './StructuredProductNameField.types';
import {
  type StructuredProductNameFieldController,
  useStructuredProductNameFieldController,
} from './useStructuredProductNameFieldController';

type ControllerProps = {
  controller: StructuredProductNameFieldController;
};

function TitleTermsAction({ href }: { href: string }): React.JSX.Element {
  return (
    <Button size='xs' variant='outline' asChild>
      <a href={href} target='_blank' rel='noopener noreferrer'>
        <BookType className='size-3.5' />
        <span>Open Title Terms</span>
      </a>
    </Button>
  );
}

function CatalogHint({ primaryCatalogId }: { primaryCatalogId?: string }): React.JSX.Element | null {
  if (typeof primaryCatalogId === 'string' && primaryCatalogId !== '') return null;
  return (
    <p className='text-[10px] italic leading-relaxed text-gray-500'>
      Select a catalog first to load size, material, category, and theme suggestions.
    </p>
  );
}

function SelectedCategoryHint({ label }: { label: string | null }): React.JSX.Element | null {
  if (label === null) return null;
  return (
    <p className='text-[10px] italic leading-relaxed text-gray-500'>
      Selected category: {label}
    </p>
  );
}

function StructuredProductNameInput({ controller }: ControllerProps): React.JSX.Element {
  return (
    <div
      className='relative'
      role='combobox'
      aria-haspopup='listbox'
      aria-expanded={controller.dropdownOpen}
      aria-owns={controller.dropdownOpen ? controller.listboxId : undefined}
      aria-controls={controller.dropdownOpen ? controller.listboxId : undefined}
    >
      <Input
        ref={controller.inputRef}
        id={controller.fieldName}
        name={controller.inputName}
        value={controller.value}
        onChange={controller.onChange}
        onFocus={controller.onFocus}
        onClick={controller.onClick}
        onKeyUp={controller.onKeyUp}
        onKeyDown={controller.onKeyDown}
        onBlur={controller.onBlur}
        placeholder={controller.placeholder}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        aria-autocomplete='list'
        aria-controls={controller.dropdownOpen ? controller.listboxId : undefined}
        aria-activedescendant={controller.activeDescendantId}
        spellCheck={false}
        className={cn(controller.error !== undefined && 'border-red-500/60')}
      />
      {controller.dropdownOpen ? (
        <ProductTitleSuggestionPanel
          listboxId={controller.listboxId}
          listboxLabel={controller.listboxLabel}
          suggestions={controller.suggestions}
          highlightedIndex={controller.highlightedIndex}
          onApply={controller.onApplySuggestion}
          onHighlight={controller.onHighlightSuggestion}
        />
      ) : null}
    </div>
  );
}

function StructuredProductNameFieldView({ controller }: ControllerProps): React.JSX.Element {
  return (
    <FormField
      label={controller.label}
      error={controller.error}
      description={controller.description}
      id={controller.fieldName}
      actions={<TitleTermsAction href={controller.titleTermsHref} />}
    >
      <StructuredProductNameInput controller={controller} />
      <CatalogHint primaryCatalogId={controller.primaryCatalogId} />
      <SelectedCategoryHint label={controller.selectedCategoryLabel} />
    </FormField>
  );
}

export function StructuredProductNameField(
  props: StructuredProductNameFieldProps = {}
): React.JSX.Element {
  const controller = useStructuredProductNameFieldController(props);
  return <StructuredProductNameFieldView controller={controller} />;
}
