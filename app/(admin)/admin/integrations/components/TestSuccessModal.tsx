"use client";

import ModalShell from "@/components/ui/modal-shell";

type TestSuccessModalProps = {
  message: string | null;
  onClose: () => void;
};

export function TestSuccessModal({ message, onClose }: TestSuccessModalProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <ModalShell title="Playwright Test" onClose={onClose} size="md">
          <div className="space-y-3 text-sm text-gray-300">
            <div className="max-h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
              <p className="whitespace-pre-wrap break-words">{message}</p>
            </div>
          </div>
        </ModalShell>
      </div>
    </div>
  );
}
