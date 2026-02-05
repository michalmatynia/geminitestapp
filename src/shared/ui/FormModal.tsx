"use client";

import { AppModal } from "./app-modal";
import type { ReactNode } from "react";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  isSaving?: boolean;
  saveText?: string;
  cancelText?: string;
  formRef?: React.RefObject<HTMLFormElement | null>; // Changed from formId
  size?: "sm" | "md" | "lg" | "xl";
  actions?: ReactNode; // Additional actions for the header
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  isSaving = false,
  saveText = "Save",
  cancelText = "Cancel",
  formRef, // Changed from formId
  size = "md",
  actions,
}: FormModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        {formRef ? ( // Changed from formId
          <Button
            type="button" // Changed to button as we'll use onClick to trigger submit
            onClick={() => formRef.current?.requestSubmit()} // Use ref to trigger submit
            disabled={isSaving}
            className="min-w-[100px] border border-white/20 hover:border-white/40"
          >
            {isSaving ? "Saving..." : saveText}
          </Button>
        ) : (
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="min-w-[100px] border border-white/20 hover:border-white/40"
          >
            {isSaving ? "Saving..." : saveText}
          </Button>
        )}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button
          type="button"
          onClick={onClose}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {cancelText}
        </Button>
      </div>
    </div>
  );

  return (
    <AppModal
      open={isOpen}
      onOpenChange={onClose} // Pass onClose to AppModal's onOpenChange
      title={title} // Pass title for accessibility, though custom header includes it
      header={header}
      size={size}
    >
      {children}
    </AppModal>
  );
}