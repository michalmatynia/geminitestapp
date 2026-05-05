import type React from 'react';

import { FormField, FormModal } from '@/shared/ui/forms-and-actions.public';
import { Input, SelectSimple } from '@/shared/ui/primitives.public';

import type { FilemakerLexiconValidationPattern } from '../types';
import type { FilemakerLexiconTypeOption } from './AdminFilemakerLexiconPage.type-metadata';

type FilemakerLexiconValidationPatternsModalProps = {
  drafts: FilemakerLexiconValidationPattern[];
  editCategoryOptions: FilemakerLexiconTypeOption[];
  isSaving: boolean;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSave: () => void;
  open: boolean;
};

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
        <FormField label='Label' required>
          <Input
            aria-label='Pattern label'
            value={draft.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange(draft.id, { label: e.target.value })
            }
          />
        </FormField>
        <FormField label='Target type'>
          <SelectSimple
            aria-label='Pattern target type'
            value={draft.targetTypeKey ?? ''}
            options={editCategoryOptions}
            onChange={(value: string): void => onChange(draft.id, { targetTypeKey: value })}
          />
        </FormField>
        <FormField label='Pattern' required>
          <Input
            aria-label='Pattern regex'
            value={draft.pattern}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange(draft.id, { pattern: e.target.value })
            }
          />
        </FormField>
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

export function FilemakerLexiconValidationPatternsModal(
  props: FilemakerLexiconValidationPatternsModalProps
): React.JSX.Element {
  const { drafts, editCategoryOptions, isSaving, onAdd, onChange, onClose, onRemove, onSave, open } = props;
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
