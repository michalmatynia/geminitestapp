import { useRef } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import type { NoteRecord } from '@/shared/types/domain/notes';
import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormModal } from '@/shared/ui';

import { NoteForm } from './NoteForm';

interface CreateNoteModalProps extends ModalStateProps {}

export function CreateNoteModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateNoteModalProps): React.JSX.Element | null {
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Create Note'
      formRef={formRef}
      onSave={onSuccess}
      saveText='Create'
      actions={
        <TriggerButtonBar location='note_modal' entityType='note' />
      }
    >
      <NoteForm
        formRef={formRef}
        onSuccess={onSuccess}
      />
    </FormModal>
  );
}
