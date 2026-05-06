import type React from 'react';

import { FormField, FormModal, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

import type { FilemakerLexiconEditorState, FilemakerLexiconFormState } from './AdminFilemakerLexiconPage.helpers';
import type { FilemakerLexiconTypeOption } from './AdminFilemakerLexiconPage.type-metadata';

type FilemakerLexiconEditorModalProps = {
  /** Available category options for the term's type selector. */
  editCategoryOptions: FilemakerLexiconTypeOption[];
  /** Current editor state — whether it's open, which term is being edited, and the live form values. */
  editor: FilemakerLexiconEditorState;
  /** Disables the save button and shows a loading indicator while the mutation is in flight. */
  isSaving: boolean;
  /** Called with a partial patch whenever any form field changes. */
  onChange: (patch: Partial<FilemakerLexiconFormState>) => void;
  /** Closes the modal without saving. */
  onClose: () => void;
  /** Triggers the save mutation. */
  onSave: () => void;
};

/**
 * Modal for creating or editing a single Filemaker lexicon term.
 * The title and save button label switch between "Add" and "Edit" based on
 * whether `editor.editing` is null (new term) or set (existing term).
 */
export function FilemakerLexiconEditorModal(
  props: FilemakerLexiconEditorModalProps
): React.JSX.Element {
  const { editor, editCategoryOptions, isSaving, onChange, onClose, onSave } = props;
  // Distinguish between creating a new term and editing an existing one.
  const isNew = editor.editing === null;

  return (
    <FormModal
      open={editor.open}
      onClose={onClose}
      title={isNew ? 'Add Lexicon Term' : 'Edit Lexicon Term'}
      onSave={onSave}
      isSaving={isSaving}
      isSaveDisabled={editor.form.label.trim().length === 0}
      saveText='Save term'
    >
      <div className='space-y-4'>
        {/* Human-readable display name shown as a pill on job listings. */}
        <FormField label='Label' required>
          <Input
            aria-label='Term label'
            value={editor.form.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange({ label: e.target.value })
            }
          />
        </FormField>
        {/* Lexicon type that determines pill colour and grouping. */}
        <FormField label='Category' required>
          <SelectSimple
            ariaLabel='Term type'
            value={editor.form.category}
            options={editCategoryOptions}
            onValueChange={(value: string): void =>
              onChange({ category: value as FilemakerLexiconFormState['category'] })
            }
          />
        </FormField>
        {/* Optional URL for a small icon rendered alongside the pill. */}
        <FormField label='Icon URL'>
          <Input
            aria-label='Term icon URL'
            value={editor.form.iconUrl ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange({ iconUrl: e.target.value })
            }
          />
        </FormField>
      </div>
    </FormModal>
  );
}
