"use client";

import { AppModal } from "@/shared/ui/app-modal";
import ModalShell from "@/shared/components/modal-shell";

type TestSuccessModalProps = {
  message: string | null;
  onClose: () => void;
};

export function TestSuccessModal({ message, onClose }: TestSuccessModalProps) {
  if (!message) return null;

  return (
    <AppModal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="Playwright Test"
    >
      <ModalShell title="Playwright Test" onClose={onClose} size="md">
        <div className="space-y-3 text-sm text-gray-300">
          <div className="max-h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
        </div>
      </ModalShell>
    </AppModal>
  );
}
