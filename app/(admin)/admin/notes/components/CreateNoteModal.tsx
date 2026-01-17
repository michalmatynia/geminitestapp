import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import { NoteForm } from "./NoteForm";
import type { CreateNoteModalProps } from "@/types/notes-ui";

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
}: CreateNoteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <ModalShell title="Create Note" onClose={onClose}>
          <NoteForm
            folderTree={folderTree}
            defaultFolderId={selectedFolderId}
            availableTags={tags}
            notebookId={selectedNotebookId}
            onSuccess={onSuccess}
            onTagCreated={onTagCreated}
            folderTheme={folderTheme}
            onSelectRelatedNote={onSelectRelatedNote}
          />
        </ModalShell>
      </div>
    </div>
  );
}
