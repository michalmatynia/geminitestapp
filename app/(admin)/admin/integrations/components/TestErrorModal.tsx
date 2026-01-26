"use client";

import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";

type TestErrorModalProps = {
  testError: string | null;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  onClose: () => void;
};

export function TestErrorModal({
  testError,
  testErrorMeta,
  onClose,
}: TestErrorModalProps) {
  if (!testError) return null;

  const handleCopyTestError = async () => {
    if (!testError) return;
    try {
      const metaLines = [
        testErrorMeta?.errorId ? `Error ID: ${testErrorMeta.errorId}` : null,
        testErrorMeta?.integrationId
          ? `Integration ID: ${testErrorMeta.integrationId}`
          : null,
        testErrorMeta?.connectionId
          ? `Connection ID: ${testErrorMeta.connectionId}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const copyText = metaLines ? `${metaLines}\n\n${testError}` : testError;
      await navigator.clipboard.writeText(copyText);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      const metaLines = [
        testErrorMeta?.errorId ? `Error ID: ${testErrorMeta.errorId}` : null,
        testErrorMeta?.integrationId
          ? `Integration ID: ${testErrorMeta.integrationId}`
          : null,
        testErrorMeta?.connectionId
          ? `Connection ID: ${testErrorMeta.connectionId}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      textarea.value = metaLines ? `${metaLines}\n\n${testError}` : testError;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const footer = (
    <Button
      className="border border-white/20 hover:border-white/40"
      type="button"
      onClick={() => { void handleCopyTestError(); }}
    >
      Copy Error
    </Button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <ModalShell title="Playwright Error" onClose={onClose} size="lg" footer={footer}>
          <div className="space-y-3">
            <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300">
              Copy the raw error to share or debug it.
            </div>
            {(testErrorMeta?.errorId ||
              testErrorMeta?.integrationId ||
              testErrorMeta?.connectionId) && (
              <div className="grid gap-2 rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                    Error ID
                  </p>
                  <p className="mt-1 break-all text-gray-200">
                    {testErrorMeta?.errorId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                    Integration ID
                  </p>
                  <p className="mt-1 break-all text-gray-200">
                    {testErrorMeta?.integrationId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                    Connection ID
                  </p>
                  <p className="mt-1 break-all text-gray-200">
                    {testErrorMeta?.connectionId || "—"}
                  </p>
                </div>
              </div>
            )}
            <pre className="max-h-72 overflow-auto rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-200">
              <code className="select-text whitespace-pre-wrap">{testError}</code>
            </pre>
          </div>
        </ModalShell>
      </div>
    </div>
  );
}
