'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { SearchInput, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { FilemakerLexiconValidationPatternsModal } from './AdminFilemakerLexiconValidationPatternsModal';
import { FilemakerLexiconEditorModal } from './AdminFilemakerLexiconEditorModal';
import { FilemakerLexiconTypesModal } from './AdminFilemakerLexiconTypesModal';
import { parseFilemakerLexiconCategoryFilter } from './AdminFilemakerLexiconPage.type-metadata';
import type { FilemakerLexiconTypeOption } from './AdminFilemakerLexiconPage.type-metadata';
import { createFilemakerLexiconColumns } from './AdminFilemakerLexiconColumns';
import type { FilemakerLexiconPageViewProps } from './AdminFilemakerLexiconPage.types';

/**
 * Top-level view for the Filemaker Lexicon admin page.
 * Renders the page header, filterable data table, and all modals.
 * State and mutations are owned by the parent page component.
 */
export function FilemakerLexiconPageView(props: FilemakerLexiconPageViewProps): React.JSX.Element {
  // Build column definitions with row-level edit/delete callbacks.
  const columns = createFilemakerLexiconColumns({
    onDeleteTerm: props.onDeleteTerm,
    onEditTerm: props.onEditTerm,
    typeMetadata: props.typeMetadata,
  });

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Lexicon'
        description='Reusable job-board pills and tags for categorizing scraped job offers.'
        icon={<BookOpen className='size-4' />}
        actions={props.actions}
      />
      <StandardDataTablePanel
        filters={
          <FilemakerLexiconFilters
            categoryOptions={props.categoryOptions}
            categoryFilter={props.categoryFilter}
            query={props.query}
            setCategoryFilter={props.onCategoryFilterChange}
            setQuery={props.setQuery}
          />
        }
        columns={columns}
        data={props.data}
        isLoading={props.isLoading}
        emptyState='No lexicon terms found.'
        maxHeight='70vh'
        getRowId={(row) => row.term.id}
      />
      {/* All modals are rendered here so they sit outside the table scroll container. */}
      <Modals {...props} />
      <props.ConfirmationModal />
    </div>
  );
}

/**
 * Groups all three lexicon modals (term editor, type manager, validation patterns)
 * into a single component to keep the main view clean.
 */
function Modals(props: FilemakerLexiconPageViewProps): React.JSX.Element {
  return (
    <>
      {/* Create / edit a single lexicon term. */}
      <FilemakerLexiconEditorModal
        editCategoryOptions={props.editCategoryOptions}
        editor={props.editor}
        isSaving={props.isLoading}
        onChange={props.onEditorChange}
        onClose={props.onEditorClose}
        onSave={() => { void props.onEditorSave(); }}
      />
      {/* Manage the set of lexicon type definitions (labels, sort order, descriptions). */}
      <FilemakerLexiconTypesModal
        drafts={props.typeEditor.drafts}
        isSaving={props.isLoading}
        onChange={props.typeEditor.changeDraft}
        onClose={props.typeEditor.close}
        onSave={() => { void props.typeEditor.save(); }}
        open={props.typeEditor.open}
      />
      {/* Manage regex validation patterns used to auto-classify scraped terms. */}
      <FilemakerLexiconValidationPatternsModal
        drafts={props.patternEditor.drafts}
        editCategoryOptions={props.editCategoryOptions}
        isSaving={props.isLoading}
        onAdd={props.patternEditor.addPattern}
        onChange={props.patternEditor.changePattern}
        onClose={props.patternEditor.close}
        onRemove={props.patternEditor.removePattern}
        onSave={() => { void props.patternEditor.save(); }}
        open={props.patternEditor.open}
      />
    </>
  );
}

/**
 * Filter bar rendered above the lexicon data table.
 * Provides a category type selector and a free-text search input.
 */
function FilemakerLexiconFilters(props: {
  categoryOptions: Array<FilemakerLexiconTypeOption | { label: string; value: 'all' }>;
  categoryFilter: FilemakerLexiconTypeOption['value'] | 'all';
  query: string;
  setCategoryFilter: (value: FilemakerLexiconTypeOption['value'] | 'all') => void;
  setQuery: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      {/* Dropdown to filter the table by lexicon type category. */}
      <SelectSimple
        ariaLabel='Lexicon type'
        value={props.categoryFilter}
        options={props.categoryOptions}
        onValueChange={(value) => props.setCategoryFilter(parseFilemakerLexiconCategoryFilter(value))}
      />
      <div className='w-full max-w-sm'>
        {/* Free-text search across term labels. */}
        <SearchInput
          value={props.query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => props.setQuery(event.target.value)}
          onClear={() => props.setQuery('')}
          placeholder='Search lexicon terms...'
          aria-label='Search lexicon terms'
          size='sm'
        />
      </div>
    </div>
  );
}
