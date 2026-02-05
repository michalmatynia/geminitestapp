import { FormModal } from "@/shared/ui";
import { useRef } from "react";



import { NoteForm } from "./NoteForm";
import type { CreateNoteModalProps } from "@/features/notesapp/types/notes-ui";
import { TriggerButtonBar } from "@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar";

export function CreateNoteModal({
  isOpen,
  onClose,
  folderTree,
  selectedFolderId,
  tags,
  selectedNotebookId,
  onSuccess, // This is the success callback after note creation
  onTagCreated,
  folderTheme,
  onSelectRelatedNote,
}: CreateNoteModalProps): React.JSX.Element | null {
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Note"
      formRef={formRef} // Pass the ref here
      onSave={onSuccess} // Pass onSuccess as the onSave callback if formRef is not used
      saveText="Create"
      actions={
        <TriggerButtonBar location="note_modal" entityType="note" />
      }
    >
      <NoteForm
        formRef={formRef}
        folderTree={folderTree}
        defaultFolderId={selectedFolderId}
        availableTags={tags}
        notebookId={selectedNotebookId}
        onSuccess={onSuccess}
        onTagCreated={onTagCreated}
        folderTheme={folderTheme}
        onSelectRelatedNote={onSelectRelatedNote}
      />
    </FormModal>
  );
}
