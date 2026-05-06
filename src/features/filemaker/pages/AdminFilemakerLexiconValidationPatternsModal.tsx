import type React from 'react';

import { FormField, FormModal, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

import type { FilemakerLexiconValidationPattern } from '../types';
import type { FilemakerLexiconTypeOption } from './AdminFilemakerLexiconPage.type-metadata';

type FilemakerLexiconValidationPatternsModalProps = {
  /** Live draft list — one entry per pattern being edited. */
  drafts: FilemakerLexiconValidationPattern[];
  /** Category options used to assign a target lexicon type to each pattern. */
  editCategoryOptions: FilemakerLexiconTypeOption[];
  /** Disables save and shows a spinner while the mutation is in flight. */
  isSaving: boolean;
  /** Appends a new blank pattern draft to the list. */
  onAdd: () => void;
  /** Applies a partial patch to the draft identified by `id`. */
  onChange: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  /** Closes the modal without saving. */
  onClose: () => void;
  /** Removes the draft identified by `id` from the list. */
  onRemove: (id: string) => void;
  /** Persists all drafts. */
  onSave: () => void;
  open: boolean;
};

/**
 * Editable row for a single validation pattern draft.
 * Renders label, target-type selector, regex pattern, and priority fields.
 */
/* eslint-disable-next-line max-lines-per-function */
function PatternDraftSection(props: {
  draft: FilemakerLexiconValidationPattern;
  editCategoryOptions: FilemakerLexiconTypeOption[];
  onChange: FilemakerLexiconValidationPatternsModalProps['onChange'];
  onRemove: FilemakerLexiconValidationPatternsModalProps['onRemove'];
}): React.JSX.Element {
  const { draft, editCategoryOptions, onChange, onRemove } = props;
  return (
    <section className='rounded border border-border/50 p-3'>
      <div className='mb-3 flex items-center justify-between'>
        {/* Show the pattern's stable ID as a read-only identifier. */}
        <span className='text-xs font-medium uppercase text-muted-foreground'>{draft.id}</span>
        <button
          type='button'
          className='text-xs text-destructive hover:underline'
          onClick={(): void => onRemove(draft.id)}
        >
          Remove
        </button>
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
        {/* Human-readable name shown in the admin UI. */}
        <FormField label='Label' required>
          <Input
            aria-label='Pattern label'
            value={draft.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange(draft.id, { label: e.target.value })
            }
          />
        </FormField>
        {/* Lexicon type this pattern should classify matched terms into. */}
        <FormField label='Target type'>
          <SelectSimple
            aria-label='Pattern target type'
            value={draft.targetTypeKey}
            options={editCategoryOptions}
            onChange={(value: string): void => onChange(draft.id, { targetTypeKey: value })}
          />
        </FormField>
        {/* Regex applied against scraped job-listing text to detect this term. */}
        <FormField label='Pattern' required>
          <Input
            aria-label='Pattern regex'
            value={draft.pattern}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange(draft.id, { pattern: e.target.value })
            }
          />
        </FormField>
        {/* Lower number = evaluated earlier; higher number = lower precedence. */}
        <FormField label='Priority'>
          <Input
            aria-label='Pattern priority'
            type='number'
            min='0'
            step='1'
            value={draft.priority}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange(draft.id, { priority: Number(e.target.value) })
            }
          />
        </FormField>
      </div>
    </section>
  );
}

/**
 * Modal for managing the full set of lexicon validation patterns.
 * Each pattern is a regex rule that auto-classifies scraped job-listing text
 * into a lexicon term category. Patterns are evaluated in priority order.
 * Save is blocked while any draft has an empty label or pattern.
 */
export function FilemakerLexiconValidationPatternsModal(
  props: FilemakerLexiconValidationPatternsModalProps
): React.JSX.Element {
  const { drafts, editCategoryOptions, isSaving, onAdd, onChange, onClose, onRemove, onSave, open } = props;
  // Block save if any draft is incomplete — both label and pattern are required.
  const hasInvalid = drafts.some((d) => d.label.trim().length === 0 || d.pattern.trim().length === 0);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title='Manage Validation Patterns'
      subtitle='Regex patterns used to auto-classify lexicon terms.'
      onSave={onSave}
      isSaving={isSaving}
      isSaveDisabled={hasInvalid}
      saveText='Save patterns'
      size='lg'
    >
      <div className='max-h-[65vh] space-y-3 overflow-y-auto pr-1'>
        {drafts.map((draft) => (
          <PatternDraftSection
            key={draft.id}
            draft={draft}
            editCategoryOptions={editCategoryOptions}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
        {/* Append a new blank draft at the bottom of the list. */}
        <button
          type='button'
          className='w-full rounded border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-foreground/40'
          onClick={onAdd}
        >
          + Add pattern
        </button>
      </div>
    </FormModal>
  );
}
