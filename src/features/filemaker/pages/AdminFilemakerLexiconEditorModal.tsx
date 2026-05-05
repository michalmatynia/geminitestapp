import type React from 'react';

import { FormField, FormModal } from '@/shared/ui/forms-and-actions.public';
import { Input, SelectSimple } from '@/shared/ui/primitives.public';

import type { FilemakerLexiconEditorState, FilemakerLexiconFormState } from './AdminFilemakerLexiconPage.helpers';
import type { FilemakerLexiconTypeOption } from './AdminFilemakerLexiconPage.type-metadata';

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
  const { editor, editCategoryOptions, isSaving, onChange, onClose, onSave } = props;
  const isNew = editor.editing === null;

  return (
    <FormModal
      open={editor.open}
      onClose={onClose}
      title={isNew ? 'Add Lexicon Term' : 'Edit Lexicon Term'}
      onSave={onSave}
      isSaving={isSaving}
      isSaveDisabled={editor.form.label.trim().length === 0}
      saveText={isNew ? 'Add term' : 'Save term'}
    >
      <div className='space-y-4'>
        <FormField label='Label' required>
          <Input
            aria-label='Term label'
            value={editor.form.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onChange({ label: e.target.value })
            }
          />
        </FormField>
        <FormField label='Category' required>
          <SelectSimple
            aria-label='Term category'
            value={editor.form.category}
            options={editCategoryOptions}
            onChange={(value: string): void =>
              onChange({ category: value as FilemakerLexiconFormState['category'] })
            }
          />
        </FormField>
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
