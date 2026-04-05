'use client';

import { useRef } from 'react';

import type { NoteRecord } from '@/shared/contracts/notes';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { FormModal } from '@/shared/ui/forms-and-actions.public';

import { NoteForm } from './NoteForm';

export function CreateNoteModal(props: EntityModalProps<NoteRecord>): React.JSX.Element | null {
  const { isOpen, onClose, onSuccess } = props;

  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const handleSuccess = onSuccess ?? (() => {});

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Create Note'
      formRef={formRef}
      onSave={handleSuccess}
      saveText='Create'
      actions={<TriggerButtonBar location='note_modal' entityType='note' />}
    >
      <NoteForm formRef={formRef} onSuccess={handleSuccess} />
    </FormModal>
  );
}
