import type { RuntimeHistoryEntry, RuntimeHistoryLink } from '@/shared/lib/ai-paths';
import { formatDurationMs, formatRuntimeValue } from '@/shared/lib/ai-paths';
import { StatusBadge, EmptyState, Button, type StatusVariant } from '@/shared/ui';

type RunHistoryEntriesProps = {
  entries: RuntimeHistoryEntry[];
  emptyMessage?: string;
  showNodeLabel?: boolean;
  onReplayFromEntry?: (entry: RuntimeHistoryEntry) => void;
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

const formatSkipReason = (value: string): string =>
  value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function RunHistoryEntries(props: RunHistoryEntriesProps): React.JSX.Element {
  const { entries, emptyMessage, showNodeLabel, onReplayFromEntry } = props;
  const sortedEntries = [...entries].sort(
    (a: RuntimeHistoryEntry, b: RuntimeHistoryEntry) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedEntries.length === 0) {
    return (
      <EmptyState
        title='No history'
        description={emptyMessage ?? 'No history recorded yet.'}
        variant='compact'
      />
    );
  }

  return (
    <div className='space-y-4'>
      {sortedEntries.map((entry: RuntimeHistoryEntry, index: number) => {
        const pathLabel = entry.pathName ?? entry.pathId ?? 'Unknown path';
        const nodeLabel = entry.nodeTitle ?? entry.nodeId;
        const variantMap: Record<string, string> = {
          completed: 'success',
          failed: 'error',
          delayed: 'warning',
          cached: 'info',
          skipped: 'neutral',
        };
        const variant = (variantMap[entry.status] as StatusVariant) ?? 'neutral';
        return (
          <div
            key={`${entry.timestamp}-${index}`}
            className='rounded-md border border-border bg-card/40 p-4'
          >
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-xs text-gray-400'>
                {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div className='flex flex-wrap items-center gap-2 text-xs text-gray-400'>
                <StatusBadge status={entry.status} variant={variant} size='sm' />
                {showNodeLabel ? (
                  <span className='text-gray-200'>
                    Node: {nodeLabel}
                    {entry.nodeType ? ` ({entry.nodeType})` : ''}
                  </span>
                ) : null}
                <span className='text-gray-500'>Path: {pathLabel}</span>
                {typeof entry.iteration === 'number' && (
                  <span className='text-gray-500'>Iter {entry.iteration + 1}</span>
                )}
                {typeof entry.durationMs === 'number' && entry.durationMs > 0 && (
                  <span className='text-[10px] text-gray-500'>
                    {formatDurationMs(entry.durationMs)}
                  </span>
                )}
                {typeof entry.delayMs === 'number' &&
                  entry.delayMs !== null &&
                  entry.delayMs !== undefined &&
                  entry.delayMs > 0 && (
                    <span className='text-[10px] text-amber-300/80'>
                      +{entry.delayMs}ms delay
                    </span>
                  )}
                {typeof entry.runId === 'string' && entry.runId && (
                  <span className='font-mono text-[10px] text-gray-500'>
                    {entry.runId.slice(0, 8)}…
                  </span>
                )}
                {typeof entry.runStartedAt === 'string' && entry.runStartedAt && (
                  <span className='text-[10px] text-gray-500'>
                    run @ {new Date(entry.runStartedAt).toLocaleTimeString()}
                  </span>
                )}
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-6 px-2 text-[10px]'
                  disabled={!onReplayFromEntry}
                  onClick={(): void => {
                    onReplayFromEntry?.(entry);
                  }}
                  title={
                    onReplayFromEntry
                      ? 'Replay this run from the recorded inputs.'
                      : 'Replay is not available in this context.'
                  }
                >
                  Replay from here
                </Button>
              </div>
            </div>
            {entry.error && (
              <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-semibold'>Error</span>
                  {typeof entry.outputs?.['errorCode'] === 'string' && (
                    <span className='rounded-full border border-rose-400/60 bg-rose-500/20 px-2 py-px text-[10px] font-mono uppercase text-rose-100'>
                      {entry.outputs['errorCode'] as string}
                    </span>
                  )}
                </div>
                <div className='mt-1'>{entry.error}</div>
              </div>
            )}
            {entry.skipReason && (
              <div className='mt-2 rounded-md border border-zinc-500/30 bg-zinc-500/10 p-2 text-xs text-zinc-200'>
                Skip reason: {formatSkipReason(entry.skipReason)}
              </div>
            )}
            {entry.delayMs !== null && entry.delayMs !== undefined && (
              <div className='mt-2 text-xs text-amber-200'>Delay: {entry.delayMs}ms</div>
            )}
            {entry.durationMs != null && entry.durationMs > 0 && (
              <div className='mt-1 text-[10px] text-gray-400'>
                Duration: {formatDurationMs(entry.durationMs)}
              </div>
            )}
            <div className='mt-3 grid gap-4 lg:grid-cols-2'>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>Inputs</div>
                <pre className='mt-2 max-h-64 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                  {formatPortData(entry.inputs)}
                </pre>
              </div>
              <div>
                <div className='flex items-center justify-between text-[11px] uppercase text-gray-500'>
                  <span>Outputs</span>
                  {Array.isArray((entry.outputs as Record<string, unknown>)?.['__logs']) &&
                  ((entry.outputs as Record<string, unknown>)['__logs'] as unknown[]).length > 0 ? (
                    <span className='rounded-full border border-sky-500/50 bg-sky-500/15 px-2 py-px text-[10px] font-mono normal-case text-sky-100'>
                      Logs:{' '}
                      {
                        ((entry.outputs as Record<string, unknown>)['__logs'] as unknown[])
                          .length
                      }
                    </span>
                  ) : null}
                </div>
                <pre className='mt-2 max-h-64 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                  {formatPortData(entry.outputs)}
                </pre>
              </div>
            </div>
            <div className='mt-3 grid gap-4 lg:grid-cols-2 text-xs text-gray-400'>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>From</div>
                {entry.inputsFrom && entry.inputsFrom.length > 0 ? (
                  <ul className='mt-2 space-y-1'>
                    {entry.inputsFrom.map((link: RuntimeHistoryLink, idx: number) => (
                      <li key={`${link.nodeId}-${idx}`}>
                        {link.nodeTitle ?? link.nodeId}
                        {link.nodeType ? ` (${link.nodeType})` : ''}
                        {link.fromPort || link.toPort ? (
                          <span className='text-gray-500'>
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
                  <div className='mt-2 text-gray-500'>No upstream connections.</div>
                )}
              </div>
              <div>
                <div className='text-[11px] uppercase text-gray-500'>To</div>
                {entry.outputsTo && entry.outputsTo.length > 0 ? (
                  <ul className='mt-2 space-y-1'>
                    {entry.outputsTo.map((link: RuntimeHistoryLink, idx: number) => (
                      <li key={`${link.nodeId}-${idx}`}>
                        {link.nodeTitle ?? link.nodeId}
                        {link.nodeType ? ` (${link.nodeType})` : ''}
                        {link.fromPort || link.toPort ? (
                          <span className='text-gray-500'>
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
                  <div className='mt-2 text-gray-500'>No downstream connections.</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
