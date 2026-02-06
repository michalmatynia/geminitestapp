import { FormModal } from "@/shared/ui";
import { useRef } from "react";



import { NoteForm } from "./NoteForm";
import type { CreateNoteModalProps } from "@/features/notesapp/types/notes-ui";
import { useNotesAppContext } from "@/features/notesapp/hooks/NotesAppContext";
import { TriggerButtonBar } from "@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar";

export function CreateNoteModal({
  isOpen,
  onClose,
}: CreateNoteModalProps): React.JSX.Element | null {
  const { handleCreateSuccess } = useNotesAppContext();
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Note"
      formRef={formRef} // Pass the ref here
      onSave={handleCreateSuccess} // Pass onSuccess as the onSave callback if formRef is not used
      saveText="Create"
      actions={
        <TriggerButtonBar location="note_modal" entityType="note" />
      }
    >
      <NoteForm
        formRef={formRef}
        onSuccess={handleCreateSuccess}
      />
    </FormModal>
  );
}
