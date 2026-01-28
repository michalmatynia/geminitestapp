"use client";

import { ModalShell, Button, AppModal, SectionHeader } from "@/shared/ui";
import { useRef, useState } from "react";
import { DraftList } from "../components/DraftList";
import { DraftCreator } from "../components/DraftCreator";




export function AdminDraftsPage() {
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
      <SectionHeader
        title="Product Drafts"
        description="Create reusable templates for products with pre-filled values"
        className="mb-6"
      />

      <DraftList
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshTrigger={refreshTrigger}
      />

      <AppModal
        open={isCreatorOpen}
        onOpenChange={(open) => !open && handleCloseCreator()}
        title={title}
      >
        <ModalShell title={title} onClose={handleCloseCreator} header={header}>
          <DraftCreator
            formRef={formRef}
            draftId={editingDraftId}
            onSaveSuccess={handleSaveSuccess}
            onCancel={handleCloseCreator}
          />
        </ModalShell>
      </AppModal>
    </div>
  );
}
