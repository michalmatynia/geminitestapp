"use client";

import { TestLogEntry } from "../types";

type TestLogModalProps = {
  selectedStep: (TestLogEntry & { status: "ok" | "failed" }) | null;
  onClose: () => void;
};

export function TestLogModal({ selectedStep, onClose }: TestLogModalProps) {
  if (!selectedStep) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-gray-950 p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Playwright Log</h3>
          <button
            className="text-sm text-gray-400 hover:text-white"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
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
      </div>
    </div>
  );
}
