import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ModalShell from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
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
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => {
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
      <Button
        type="button"
        onClick={onClose}
        className="min-w-[100px] border border-white/20 hover:border-white/40"
      >
        Close
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
        <ModalShell title="Create Note" onClose={onClose} header={header}>
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
        </ModalShell>
      </DialogContent>
    </Dialog>
  );
}
