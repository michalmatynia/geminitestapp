import { Button, SharedModal } from "@/shared/ui";
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
  onSuccess,
  onTagCreated,
  folderTheme,
  onSelectRelatedNote,
}: CreateNoteModalProps): React.JSX.Element | null {
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Button
          onClick={(): void => {
            if (formRef.current) {
              formRef.current.requestSubmit();
            }
          }}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          Create
        </Button>
        <h2 className="text-2xl font-bold text-white">Create Note</h2>
      </div>
      <div className="flex items-center gap-2">
        <TriggerButtonBar location="note_modal" entityType="note" />
        <Button
          type="button"
          onClick={onClose}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <SharedModal
      open={isOpen}
      onClose={onClose}
      title="Create Note"
      header={header}
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
    </SharedModal>
  );
}
