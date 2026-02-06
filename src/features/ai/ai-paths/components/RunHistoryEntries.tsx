'use client';

import type { RuntimeHistoryEntry, RuntimeHistoryLink } from '@/features/ai/ai-paths/lib';
import { formatRuntimeValue } from '@/features/ai/ai-paths/lib';

type RunHistoryEntriesProps = {
  entries: RuntimeHistoryEntry[];
  emptyMessage?: string;
  showNodeLabel?: boolean;
};

const statusStyles: Record<string, string> = {
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  delayed: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  cached: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
};

const formatHistoryValue = (value: unknown): string => {
  if (value === undefined) return '-';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return formatRuntimeValue(value);
  }
};

const formatPortData = (value: unknown): string => {
  if (value === undefined || value === null) return '-';
  if (typeof value !== 'object') return formatHistoryValue(value);
  if (Array.isArray(value)) return value.length ? formatHistoryValue(value) : '-';
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return '-';
  return formatHistoryValue(value);
};

export function RunHistoryEntries({
  entries,
  emptyMessage,
  showNodeLabel,
}: RunHistoryEntriesProps): React.JSX.Element {
  const sortedEntries = [...entries].sort(
    (a: RuntimeHistoryEntry, b: RuntimeHistoryEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedEntries.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400">
        {emptyMessage ?? 'No history recorded yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEntries.map((entry: RuntimeHistoryEntry, index: number) => {
        const statusClass = statusStyles[entry.status] ?? 'border-border bg-card/40 text-gray-200';
        const pathLabel = entry.pathName ?? entry.pathId ?? 'Unknown path';
        const nodeLabel = entry.nodeTitle ?? entry.nodeId;
        return (
          <div key={`${entry.timestamp}-${index}`} className="rounded-md border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-400">
                {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span className={`rounded-full border px-2 py-0.5 ${statusClass}`}>
                  {entry.status}
                </span>
                {showNodeLabel ? (
                  <span className="text-gray-200">
                    Node: {nodeLabel}
                    {entry.nodeType ? ` (${entry.nodeType})` : ''}
                  </span>
                ) : null}
                <span className="text-gray-500">Path: {pathLabel}</span>
                {typeof entry.iteration === 'number' && (
                  <span className="text-gray-500">Iter {entry.iteration + 1}</span>
                )}
              </div>
            </div>
            {entry.error && (
              <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                Error: {entry.error}
              </div>
            )}
            {entry.delayMs !== null && entry.delayMs !== undefined && (
              <div className="mt-2 text-xs text-amber-200">
                Delay: {entry.delayMs}ms
              </div>
            )}
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase text-gray-500">Inputs</div>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200">
                  {formatPortData(entry.inputs)}
                </pre>
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-500">Outputs</div>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200">
                  {formatPortData(entry.outputs)}
                </pre>
              </div>
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2 text-xs text-gray-400">
              <div>
                <div className="text-[11px] uppercase text-gray-500">From</div>
                {entry.inputsFrom && entry.inputsFrom.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {entry.inputsFrom.map((link: RuntimeHistoryLink, idx: number) => (
                      <li key={`${link.nodeId}-${idx}`}>
                        {link.nodeTitle ?? link.nodeId}
                        {link.nodeType ? ` (${link.nodeType})` : ''}
                        {link.fromPort || link.toPort ? (
                          <span className="text-gray-500">
                            {' '}
                            {link.fromPort ?? 'default'}
                            {' -> '}
                            {link.toPort ?? 'default'}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-gray-500">No upstream connections.</div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-500">To</div>
                {entry.outputsTo && entry.outputsTo.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {entry.outputsTo.map((link: RuntimeHistoryLink, idx: number) => (
                      <li key={`${link.nodeId}-${idx}`}>
                        {link.nodeTitle ?? link.nodeId}
                        {link.nodeType ? ` (${link.nodeType})` : ''}
                        {link.fromPort || link.toPort ? (
                          <span className="text-gray-500">
                            {' '}
                            {link.fromPort ?? 'default'}
                            {' -> '}
                            {link.toPort ?? 'default'}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-gray-500">No downstream connections.</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
