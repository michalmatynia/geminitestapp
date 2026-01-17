"use client";

type TestSuccessModalProps = {
  message: string | null;
  onClose: () => void;
};

export function TestSuccessModal({ message, onClose }: TestSuccessModalProps) {
  if (!message) return null;

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
          <h3 className="text-lg font-semibold text-white">Playwright Test</h3>
          <button
            className="text-sm text-gray-400 hover:text-white"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="max-h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
