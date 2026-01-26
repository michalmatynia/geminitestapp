"use client";

import { useState, useRef } from "react";
import { DraftList } from "./components/DraftList";
import { DraftCreator } from "./components/DraftCreator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ModalShell from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";

export default function DraftsPage() {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const handleEdit = (id: string) => {
    setEditingDraftId(id);
    setIsCreatorOpen(true);
  };

  const handleCreateNew = () => {
    setEditingDraftId(null);
    setIsCreatorOpen(true);
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingDraftId(null);
    setIsCreatorOpen(false);
  };

  const handleCloseCreator = () => {
    setEditingDraftId(null);
    setIsCreatorOpen(false);
  };

  const title = editingDraftId ? "Edit Draft" : "Create Draft";
  const submitText = editingDraftId ? "Update" : "Create";

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
          {submitText}
        </Button>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <Button
        type="button"
        onClick={handleCloseCreator}
        className="min-w-[100px] border border-white/20 hover:border-white/40"
      >
        Close
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Product Drafts</h1>
        <p className="mt-2 text-sm text-gray-400">
          Create reusable templates for products with pre-filled values
        </p>
      </div>

      <DraftList
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshTrigger={refreshTrigger}
      />

      <Dialog open={isCreatorOpen} onOpenChange={(open) => !open && handleCloseCreator()}>
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <ModalShell title={title} onClose={handleCloseCreator} header={header}>
            <DraftCreator
              formRef={formRef}
              draftId={editingDraftId}
              onSaveSuccess={handleSaveSuccess}
              onCancel={handleCloseCreator}
            />
          </ModalShell>
        </DialogContent>
      </Dialog>
    </div>
  );
}
