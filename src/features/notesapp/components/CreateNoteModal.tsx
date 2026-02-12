import { useRef } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { FormModal } from '@/shared/ui';



import { NoteForm } from './NoteForm';


export function CreateNoteModal(): React.JSX.Element | null {
  const { isCreating, setIsCreating, handleCreateSuccess } = useNotesAppContext();
  const formRef = useRef<HTMLFormElement>(null);

  if (!isCreating) return null;

  return (
    <FormModal
      open={isCreating}
      onClose={(): void => setIsCreating(false)}
      title='Create Note'
      formRef={formRef} // Pass the ref here
      onSave={handleCreateSuccess} // Pass onSuccess as the onSave callback if formRef is not used
      saveText='Create'
      actions={
        <TriggerButtonBar location='note_modal' entityType='note' />
      }
    >
      <NoteForm
        formRef={formRef}
        onSuccess={handleCreateSuccess}
      />
    </FormModal>
  );
}
