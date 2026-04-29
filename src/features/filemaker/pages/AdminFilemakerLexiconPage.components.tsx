import type { ColumnDef } from '@tanstack/react-table';
/* eslint-disable max-lines, max-lines-per-function */
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { FormField, FormModal, SearchInput, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input } from '@/shared/ui/primitives.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';

import type {
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
  FilemakerLexiconValidationPattern,
} from '../types';
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
  patternEditor: {
    addPattern: () => void;
    changePattern: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
    close: () => void;
    drafts: FilemakerLexiconValidationPattern[];
    open: boolean;
    removePattern: (id: string) => void;
    save: () => Promise<void>;
  };
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
      <FilemakerLexiconValidationPatternsModal
        drafts={props.patternEditor.drafts}
        editCategoryOptions={props.editCategoryOptions}
        isSaving={props.isLoading}
        onAdd={props.patternEditor.addPattern}
        onChange={props.patternEditor.changePattern}
        onClose={props.patternEditor.close}
        onRemove={props.patternEditor.removePattern}
        onSave={() => {
          void props.patternEditor.save();
        }}
        open={props.patternEditor.open}
      />
      <ConfirmationModal />
    </div>
  );
}

const VALIDATION_PATTERN_MATCH_MODE_OPTIONS = [
  { label: 'Regex', value: 'regex' },
  { label: 'Partial', value: 'partial' },
  { label: 'Contains', value: 'contains' },
  { label: 'Exact', value: 'exact' },
] as const;

const VALIDATION_PATTERN_SOURCE_SCOPE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Address candidate', value: 'address_candidate' },
  { label: 'Listing field', value: 'listing_field' },
  { label: 'Listing field benefit', value: 'listing_field_benefit' },
  { label: 'Listing field contract', value: 'listing_field_contract' },
  { label: 'Listing field employment', value: 'listing_field_employment' },
  { label: 'Listing field experience', value: 'listing_field_experience' },
  { label: 'Listing field language', value: 'listing_field_language' },
  { label: 'Listing field requirement', value: 'listing_field_requirement' },
  { label: 'Listing field responsibility', value: 'listing_field_responsibility' },
  { label: 'Listing field salary', value: 'listing_field_salary' },
  { label: 'Listing field technology', value: 'listing_field_technology' },
  { label: 'Listing field work mode', value: 'listing_field_work_mode' },
  { label: 'Section', value: 'section' },
  { label: 'Section heading', value: 'section_heading' },
  { label: 'Section value', value: 'section_value' },
  { label: 'Snapshot fact', value: 'snapshot_fact' },
  { label: 'Snapshot pill', value: 'snapshot_pill' },
  { label: 'Unclassified', value: 'unclassified' },
] as const;

function FilemakerLexiconValidationPatternsModal(props: {
  drafts: FilemakerLexiconValidationPattern[];
  editCategoryOptions: FilemakerLexiconTypeOption[];
  isSaving: boolean;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSave: () => void;
  open: boolean;
}): React.JSX.Element {
  return (
    <FormModal
      open={props.open}
      onClose={props.onClose}
      title='Lexicon Validation Patterns'
      subtitle='Editable initial-classification rules applied before scraped pills become lexicon terms.'
      onSave={props.onSave}
      isSaving={props.isSaving}
      saveText='Save patterns'
      size='xl'
      actions={
        <Button type='button' variant='outline' size='sm' onClick={props.onAdd}>
          Add pattern
        </Button>
      }
    >
      <div className='space-y-3'>
        {props.drafts.map((pattern) => (
          <div
            key={pattern.id}
            className='rounded-lg border border-border/60 bg-muted/10 p-3'
          >
            <div className='mb-3 flex justify-end'>
              <Badge variant={pattern.system ? 'secondary' : 'default'}>
                {pattern.system ? 'Built-in' : 'Custom'}
              </Badge>
            </div>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-12'>
              <FormField label='Enabled' className='lg:col-span-1'>
                <Input
                  type='checkbox'
                  checked={pattern.enabled}
                  onChange={(event) =>
                    props.onChange(pattern.id, { enabled: event.target.checked })
                  }
                  aria-label={`Enable ${pattern.label}`}
                />
              </FormField>
              <FormField label='Priority' className='lg:col-span-1'>
                <Input
                  type='number'
                  min='0'
                  value={pattern.priority}
                  onChange={(event) => {
                    const priority = Number(event.target.value);
                    props.onChange(pattern.id, {
                      priority: Number.isFinite(priority) ? priority : 0,
                    });
                  }}
                />
              </FormField>
              <FormField label='Label' className='lg:col-span-4'>
                <Input
                  value={pattern.label}
                  onChange={(event) =>
                    props.onChange(pattern.id, { label: event.target.value })
                  }
                />
              </FormField>
              <FormField label='Target type' className='lg:col-span-2'>
                <SelectSimple
                  ariaLabel={`${pattern.label} target type`}
                  value={pattern.targetTypeKey}
                  options={props.editCategoryOptions}
                  onValueChange={(value) =>
                    props.onChange(pattern.id, {
                      targetTypeKey: value as FilemakerLexiconValidationPattern['targetTypeKey'],
                    })
                  }
                />
              </FormField>
              <FormField label='Mode' className='lg:col-span-2'>
                <SelectSimple
                  ariaLabel={`${pattern.label} match mode`}
                  value={pattern.matchMode}
                  options={[...VALIDATION_PATTERN_MATCH_MODE_OPTIONS]}
                  onValueChange={(value) =>
                    props.onChange(pattern.id, {
                      matchMode: value as FilemakerLexiconValidationPattern['matchMode'],
                    })
                  }
                />
              </FormField>
              <FormField label='Scope' className='lg:col-span-2'>
                <SelectSimple
                  ariaLabel={`${pattern.label} source scope`}
                  value={pattern.sourceScope}
                  options={[...VALIDATION_PATTERN_SOURCE_SCOPE_OPTIONS]}
                  onValueChange={(value) =>
                    props.onChange(pattern.id, {
                      sourceScope: value as FilemakerLexiconValidationPattern['sourceScope'],
                    })
                  }
                />
              </FormField>
              <FormField label='Pattern' className='lg:col-span-8'>
                <Input
                  value={pattern.pattern}
                  onChange={(event) =>
                    props.onChange(pattern.id, { pattern: event.target.value })
                  }
                  placeholder='regex, contains text, or exact value'
                />
              </FormField>
              <FormField label='Confidence' className='lg:col-span-2'>
                <Input
                  type='number'
                  min='0'
                  max='1'
                  step='0.01'
                  value={pattern.confidence}
                  onChange={(event) => {
                    const confidence = Number(event.target.value);
                    props.onChange(pattern.id, {
                      confidence: Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0)),
                    });
                  }}
                />
              </FormField>
              <div className='flex items-end justify-end lg:col-span-2'>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  disabled={pattern.system && !pattern.enabled}
                  onClick={() => props.onRemove(pattern.id)}
                >
                  {pattern.system ? (pattern.enabled ? 'Disable' : 'Disabled') : 'Remove'}
                </Button>
              </div>
              <FormField label='Notes' className='lg:col-span-12'>
                <Input
                  value={pattern.notes ?? ''}
                  onChange={(event) =>
                    props.onChange(pattern.id, { notes: event.target.value })
                  }
                  placeholder='Why this pattern exists.'
                />
              </FormField>
            </div>
          </div>
        ))}
        {props.drafts.length === 0 ? (
          <div className='rounded border border-dashed border-border/70 p-4 text-sm text-muted-foreground'>
            No validation patterns configured.
          </div>
        ) : null}
      </div>
    </FormModal>
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
