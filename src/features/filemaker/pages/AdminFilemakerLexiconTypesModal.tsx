import type React from 'react';

import { FormField, FormModal } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';

import type { FilemakerLexiconTypeDraft } from './AdminFilemakerLexiconPage.type-metadata';

type FilemakerLexiconTypesModalProps = {
  drafts: FilemakerLexiconTypeDraft[];
  isSaving: boolean;
  onChange: (
    key: FilemakerLexiconTypeDraft['key'],
    patch: Partial<FilemakerLexiconTypeDraft>
  ) => void;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
};

const hasInvalidDraft = (draft: FilemakerLexiconTypeDraft): boolean =>
  draft.label.trim().length === 0 || !Number.isFinite(Number(draft.sortOrder));

function LexiconTypeDraftSection(props: {
  draft: FilemakerLexiconTypeDraft;
  onChange: FilemakerLexiconTypesModalProps['onChange'];
}): React.JSX.Element {
  const { draft } = props;
  return (
    <section className='rounded border border-border/50 p-3'>
      <div className='mb-3 text-xs font-medium uppercase text-muted-foreground'>{draft.key}</div>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]'>
        <FormField label='Label' required>
          <Input
            aria-label={`${draft.key} type label`}
            value={draft.label}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              props.onChange(draft.key, { label: event.target.value })
            }
          />
        </FormField>
        <FormField label='Order' required>
          <Input
            aria-label={`${draft.key} type order`}
            type='number'
            min='0'
            step='1'
            value={draft.sortOrder}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              props.onChange(draft.key, { sortOrder: event.target.value })
            }
          />
        </FormField>
      </div>
      <div className='mt-3'>
        <FormField label='Description'>
          <Textarea
            aria-label={`${draft.key} type description`}
            value={draft.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              props.onChange(draft.key, { description: event.target.value })
            }
            rows={2}
          />
        </FormField>
      </div>
    </section>
  );
}

export function FilemakerLexiconTypesModal(
  props: FilemakerLexiconTypesModalProps
): React.JSX.Element {
  return (
    <FormModal
      open={props.open}
      onClose={props.onClose}
      title='Manage Lexicon Types'
      subtitle='Reusable type groups for job-board pills and offer tags.'
      onSave={props.onSave}
      isSaving={props.isSaving}
      isSaveDisabled={props.drafts.some(hasInvalidDraft)}
      saveText='Save types'
      size='lg'
    >
      <div className='max-h-[65vh] space-y-3 overflow-y-auto pr-1'>
        {props.drafts.map((draft: FilemakerLexiconTypeDraft) => (
          <LexiconTypeDraftSection key={draft.key} draft={draft} onChange={props.onChange} />
        ))}
      </div>
    </FormModal>
  );
}
