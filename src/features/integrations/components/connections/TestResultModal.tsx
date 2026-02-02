"use client";

import { CopyButton, SharedModal } from "@/shared/ui";

type TestResultModalProps = {
  success: boolean;
  message: string | null;
  meta?: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  onClose: () => void;
};

export function TestResultModal({
  success,
  message,
  meta,
  onClose,
}: TestResultModalProps): React.JSX.Element | null {
  if (!message) return null;

  const metaLines = [
    meta?.errorId ? `Error ID: ${meta.errorId}` : null,
    meta?.integrationId ? `Integration ID: ${meta.integrationId}` : null,
    meta?.connectionId ? `Connection ID: ${meta.connectionId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copyText = metaLines ? `${metaLines}\n\n${message}` : message;

  const footer = (
    <CopyButton
      value={copyText}
      variant="outline"
      showText
      className="border border-white/20 hover:border-white/40"
    />
  );

  return (
    <SharedModal
      open={true}
      onClose={onClose}
      title={success ? "Playwright Test Success" : "Playwright Test Error"}
      size={success ? "md" : "lg"}
      footer={footer}
    >
      <div className="space-y-3">
        {!success && (
          <div className="rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300">
            Copy the raw error to share or debug it.
          </div>
        )}
        {(meta?.errorId || meta?.integrationId || meta?.connectionId) && (
          <div className="grid gap-2 rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Error ID</p>
              <p className="mt-1 break-all text-gray-200">{meta?.errorId || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Integration ID</p>
              <p className="mt-1 break-all text-gray-200">{meta?.integrationId || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Connection ID</p>
              <p className="mt-1 break-all text-gray-200">{meta?.connectionId || "—"}</p>
            </div>
          </div>
        )}
        {success ? (
          <div className="max-h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100 text-sm">
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
        ) : (
          <pre className="max-h-72 overflow-auto rounded-md border border-border bg-card p-3 text-xs text-gray-200">
            <code className="select-text whitespace-pre-wrap">{message}</code>
          </pre>
        )}
      </div>
    </SharedModal>
  );
}
