"use client";

import { Button } from "@/shared/ui";
import { useMemo, useState } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";

interface ExportLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown> | undefined;
}

interface ExportLogViewerProps {
  logs: ExportLog[];
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function ExportLogViewer({
  logs,
  isOpen = true,
  onToggle,
}: ExportLogViewerProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const imagePayloadSummary = useMemo(() => {
    const entries = logs
      .map((log: ExportLog) => log.context)
      .filter((context: Record<string, unknown> | undefined): context is Record<string, unknown> => !!context)
      .filter(
        (context: Record<string, unknown>) =>
          typeof context.outputBytes === "number" ||
          typeof context.originalBytes === "number" ||
          typeof context.base64Length === "number"
      );
    if (entries.length === 0) return null;
    const sum = (key: "outputBytes" | "originalBytes" | "base64Length"): number =>
      entries.reduce(
        (total: number, entry: Record<string, unknown>) =>
          total + (typeof entry[key] === "number" ? (entry[key] as number) : 0),
        0
      );
    const outputModes = new Set(
      entries
        .map((entry: Record<string, unknown>) =>
          typeof entry.outputMode === "string" ? entry.outputMode : null
        )
        .filter(Boolean)
    );
    const outputFormats = new Set(
      entries
        .map((entry: Record<string, unknown>) =>
          typeof entry.outputFormat === "string" ? entry.outputFormat : null
        )
        .filter(Boolean)
    );
    const convertedCount = entries.filter((entry: Record<string, unknown>) => entry.converted === true).length;
    const resizedCount = entries.filter((entry: Record<string, unknown>) => entry.resized === true).length;
    return {
      count: entries.length,
      totalOriginalBytes: sum("originalBytes"),
      totalOutputBytes: sum("outputBytes"),
      totalBase64Length: sum("base64Length"),
      mode:
        outputModes.size === 1 ? Array.from(outputModes)[0] ?? null : "mixed",
      format:
        outputFormats.size === 1
          ? Array.from(outputFormats)[0] ?? null
          : outputFormats.size > 1
          ? "mixed"
          : null,
      convertedCount,
      resizedCount,
    };
  }, [logs]);

  const handleCopy = (): void => {
    const logText = logs
      .map((log: ExportLog) => {
        const contextStr = log.context
          ? `\n    ${JSON.stringify(log.context, null, 2)}`
          : "";
        return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${contextStr}`;
      })
      .join("\n");
    void navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (logs.length === 0) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    const precision = value >= 10 || index === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[index]}`;
  };

  return (
    <div className="rounded-lg border bg-card/50">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={(): void => onToggle?.(!isOpen)}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle?.(!isOpen);
          }
        }}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={16}
            className={`transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
          />
          <span className="font-semibold text-sm text-gray-200">
            Export Logs ({logs.length})
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
            e.stopPropagation();
            handleCopy();
          }}
          className="text-xs"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {isOpen && (
        <div className="border-t border px-4 py-3 bg-card/50 max-h-96 overflow-y-auto">
          {imagePayloadSummary && (
            <div className="mb-3 rounded-md border border-border bg-card/70 p-2 text-[11px] text-gray-300">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">
                Image payload summary
              </div>
              <div className="mt-1 flex flex-wrap gap-3">
                <span>Images: {imagePayloadSummary.count}</span>
                <span>
                  Original: {formatBytes(imagePayloadSummary.totalOriginalBytes)}
                </span>
                <span>
                  Output: {formatBytes(imagePayloadSummary.totalOutputBytes)}
                </span>
                <span>
                  Base64: {formatBytes(imagePayloadSummary.totalBase64Length)}
                </span>
                {imagePayloadSummary.mode ? (
                  <span>Mode: {imagePayloadSummary.mode}</span>
                ) : null}
                {imagePayloadSummary.format ? (
                  <span>Format: {imagePayloadSummary.format}</span>
                ) : null}
                {imagePayloadSummary.convertedCount > 0 ? (
                  <span>Converted: {imagePayloadSummary.convertedCount}</span>
                ) : null}
                {imagePayloadSummary.resizedCount > 0 ? (
                  <span>Resized: {imagePayloadSummary.resizedCount}</span>
                ) : null}
              </div>
            </div>
          )}
          <div className="space-y-2 font-mono text-xs">
            {logs.map((log: ExportLog, index: number) => {
              const bgColor =
                log.level === "error"
                  ? "bg-red-900/10 text-red-300"
                  : log.level === "warn"
                    ? "bg-yellow-900/10 text-yellow-300"
                    : "bg-gray-800/30 text-gray-300";

              return (
                <div key={index} className={`p-2 rounded ${bgColor}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="text-gray-500">
                        [{log.timestamp}] <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                      </div>
                      <div className="mt-1 break-words whitespace-pre-wrap">
                        {log.message}
                      </div>
                      {log.context && (
                        <details className="mt-2 text-gray-400 cursor-pointer">
                          <summary className="hover:text-gray-300 transition">
                            Context Details
                          </summary>
                          <pre className="mt-2 p-2 bg-card/50 rounded text-[11px] overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
