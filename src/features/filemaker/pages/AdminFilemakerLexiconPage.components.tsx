import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { FormField, FormModal, SearchInput, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input } from '@/shared/ui/primitives.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';

import type { FilemakerLexiconTerm, FilemakerLexiconTermCategory } from '../types';
import { formatTimestamp } from './filemaker-page-utils';
import {
  normalizeFilemakerLexiconKey,
  type FilemakerLexiconEditorState,
  type FilemakerLexiconFormState,
  type FilemakerLexiconTermRow,
} from './AdminFilemakerLexiconPage.helpers';
import {
  formatFilemakerLexiconCategory,
  isFilemakerLexiconCategory,
  parseFilemakerLexiconCategoryFilter,
  type FilemakerLexiconTypeDraft,
  type FilemakerLexiconTypeMetadataMap,
  type FilemakerLexiconTypeOption,
} from './AdminFilemakerLexiconPage.type-metadata';
import { FilemakerLexiconTypesModal } from './AdminFilemakerLexiconTypesModal';

type FilemakerLexiconTypeEditorViewState = {
  changeDraft: (
    key: FilemakerLexiconTypeDraft['key'],
    patch: Partial<FilemakerLexiconTypeDraft>
  ) => void;
  close: () => void;
  drafts: FilemakerLexiconTypeDraft[];
  open: boolean;
  save: () => Promise<void>;
};

type FilemakerLexiconPageViewProps = {
  actions: PanelAction[];
  categoryOptions: Array<FilemakerLexiconTypeOption | { label: string; value: 'all' }>;
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  columns: Array<ColumnDef<FilemakerLexiconTermRow, unknown>>;
  ConfirmationModal: React.ComponentType;
  data: FilemakerLexiconTermRow[];
  editCategoryOptions: FilemakerLexiconTypeOption[];
  editor: FilemakerLexiconEditorState;
  isLoading: boolean;
  onCategoryFilterChange: (value: FilemakerLexiconTermCategory | 'all') => void;
  onEditorChange: (patch: Partial<FilemakerLexiconFormState>) => void;
  onEditorClose: () => void;
  onEditorSave: () => Promise<void>;
  query: string;
  setQuery: (value: string) => void;
  typeEditor: FilemakerLexiconTypeEditorViewState;
};

export function FilemakerLexiconPageView(
  props: FilemakerLexiconPageViewProps
): React.JSX.Element {
  const { ConfirmationModal } = props;
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
        columns={props.columns}
        data={props.data}
        isLoading={props.isLoading}
        emptyState='No lexicon terms found.'
        maxHeight='70vh'
        getRowId={(row) => row.term.id}
      />
      <FilemakerLexiconEditorModal
        editCategoryOptions={props.editCategoryOptions}
        editor={props.editor}
        isSaving={props.isLoading}
        onChange={props.onEditorChange}
        onClose={props.onEditorClose}
        onSave={() => {
          void props.onEditorSave();
        }}
      />
      <FilemakerLexiconTypesModal
        drafts={props.typeEditor.drafts}
        isSaving={props.isLoading}
        onChange={props.typeEditor.changeDraft}
        onClose={props.typeEditor.close}
        onSave={() => {
          void props.typeEditor.save();
        }}
        open={props.typeEditor.open}
      />
      <ConfirmationModal />
    </div>
  );
}

type FilemakerLexiconFiltersProps = {
  categoryOptions: Array<FilemakerLexiconTypeOption | { label: string; value: 'all' }>;
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  query: string;
  setCategoryFilter: (value: FilemakerLexiconTermCategory | 'all') => void;
  setQuery: (value: string) => void;
};

export function FilemakerLexiconFilters(
  props: FilemakerLexiconFiltersProps
): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <SelectSimple
        ariaLabel='Lexicon type'
        value={props.categoryFilter}
        options={props.categoryOptions}
        onValueChange={(value) => {
          props.setCategoryFilter(parseFilemakerLexiconCategoryFilter(value));
        }}
      />
      <div className='w-full max-w-sm'>
        <SearchInput
          value={props.query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.setQuery(event.target.value);
          }}
          onClear={() => props.setQuery('')}
          placeholder='Search lexicon terms...'
          aria-label='Search lexicon terms'
          size='sm'
        />
      </div>
    </div>
  );
}

type FilemakerLexiconEditorModalProps = {
  editCategoryOptions: FilemakerLexiconTypeOption[];
  editor: FilemakerLexiconEditorState;
  isSaving: boolean;
  onChange: (patch: Partial<FilemakerLexiconFormState>) => void;
  onClose: () => void;
  onSave: () => void;
};

export function FilemakerLexiconEditorModal(
  props: FilemakerLexiconEditorModalProps
): React.JSX.Element {
  const normalizedLabel = normalizeFilemakerLexiconKey(props.editor.form.label);
  const title = props.editor.editing === null ? 'Create Lexicon Term' : 'Edit Lexicon Term';
  return (
    <FormModal
      open={props.editor.open}
      onClose={props.onClose}
      title={title}
      subtitle='Reusable tags collected from job-board offer pills.'
      onSave={props.onSave}
      isSaving={props.isSaving}
      isSaveDisabled={props.editor.form.label.trim().length === 0}
      saveText='Save term'
      size='md'
    >
      <div className='space-y-4'>
        <FormField label='Label' required>
          <Input
            value={props.editor.form.label}
            onChange={(event) => props.onChange({ label: event.target.value })}
            placeholder='contract of employment'
          />
        </FormField>
        <FormField label='Type' required>
          <SelectSimple
            ariaLabel='Term type'
            value={props.editor.form.category}
            options={props.editCategoryOptions}
            onValueChange={(value) => {
              if (isFilemakerLexiconCategory(value)) props.onChange({ category: value });
            }}
          />
        </FormField>
        <div className='rounded border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground'>
          Normalized key: {normalizedLabel.length > 0 ? normalizedLabel : 'empty'}
        </div>
      </div>
    </FormModal>
  );
}

type FilemakerLexiconColumnActions = {
  onDeleteTerm: (term: FilemakerLexiconTerm) => void;
  onEditTerm: (term: FilemakerLexiconTerm) => void;
  typeMetadata: FilemakerLexiconTypeMetadataMap;
};

export const createFilemakerLexiconColumns = (
  actions: FilemakerLexiconColumnActions
): Array<ColumnDef<FilemakerLexiconTermRow, unknown>> => [
  {
    id: 'label',
    header: 'Term',
    cell: ({ row }) => <TermLabelCell row={row.original} />,
  },
  {
    id: 'category',
    header: 'Type',
    cell: ({ row }) => (
      <TermCategoryCell row={row.original} typeMetadata={actions.typeMetadata} />
    ),
  },
  {
    id: 'usage',
    header: 'Usage',
    cell: ({ row }) => <TermUsageCell row={row.original} />,
  },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => row.original.term.sourceSite ?? 'manual',
  },
  {
    id: 'lastSeenAt',
    header: 'Last seen',
    cell: ({ row }) => formatTimestamp(row.original.term.lastSeenAt),
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => <TermActionsCell actions={actions} row={row.original} />,
  },
];

function TermLabelCell(props: { row: FilemakerLexiconTermRow }): React.JSX.Element {
  return (
    <div className='min-w-0'>
      <div className='truncate text-sm font-medium'>{props.row.term.label}</div>
      <div className='truncate pt-0.5 text-[11px] text-muted-foreground'>
        {props.row.term.normalizedLabel}
      </div>
    </div>
  );
}

function TermCategoryCell(props: {
  row: FilemakerLexiconTermRow;
  typeMetadata: FilemakerLexiconTypeMetadataMap;
}): React.JSX.Element {
  return (
    <Badge variant='outline'>
      {formatFilemakerLexiconCategory(props.row.term.typeKey, props.typeMetadata)}
    </Badge>
  );
}

function TermUsageCell(props: { row: FilemakerLexiconTermRow }): React.JSX.Element {
  return (
    <div className='text-xs text-muted-foreground'>
      {props.row.linkedJobCount} jobs / {props.row.term.occurrenceCount} sightings
    </div>
  );
}

function TermActionsCell(props: {
  actions: FilemakerLexiconColumnActions;
  row: FilemakerLexiconTermRow;
}): React.JSX.Element {
  return (
    <div className='flex justify-end gap-2'>
      <Button size='xs' variant='outline' onClick={() => props.actions.onEditTerm(props.row.term)}>
        <Pencil className='size-3.5' />
        Edit
      </Button>
      <Button
        aria-label={`Delete ${props.row.term.label}`}
        size='xs'
        variant='outline'
        className='text-rose-400'
        onClick={() => props.actions.onDeleteTerm(props.row.term)}
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}
