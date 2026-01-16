import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import { NoteForm } from "./NoteForm";
import type { CategoryWithChildren, TagRecord, ThemeRecord } from "@/types/notes";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  tags: TagRecord[];
  selectedNotebookId: string | null;
  onSuccess: () => void;
  onTagCreated: () => void;
  folderTheme: ThemeRecord | null;
  onSelectRelatedNote: (noteId: string) => void;
}

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
