"use client";

import { TestLogEntry } from "@/features/integrations/types/integrations-ui";
import ModalShell from "@/shared/ui/modal-shell";

type TestLogModalProps = {
  selectedStep: (TestLogEntry & { status: "ok" | "failed" }) | null;
  onClose: () => void;
};

export function TestLogModal({ selectedStep, onClose }: TestLogModalProps) {
  if (!selectedStep) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <ModalShell title="Playwright Log" onClose={onClose} size="md">
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <span className="text-gray-400">Step:</span> {selectedStep.step}
            </p>
            <p>
              <span className="text-gray-400">Status:</span>{" "}
              {selectedStep.status === "ok" ? "OK" : "FAILED"}
            </p>
            <p>
              <span className="text-gray-400">Time:</span>{" "}
              {new Date(selectedStep.timestamp).toLocaleString()}
            </p>
            {selectedStep.detail && (
              <p>
                <span className="text-gray-400">Detail:</span>{" "}
                {selectedStep.detail}
              </p>
            )}
            <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-400">
              {selectedStep.status === "ok"
                ? "Playwright completed this step successfully."
                : "Playwright stopped after this step due to a failure."}
            </div>
          </div>
        </ModalShell>
      </div>
    </div>
  );
}
