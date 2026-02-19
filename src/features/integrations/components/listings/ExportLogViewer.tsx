'use client';

import { useMemo } from 'react';

import { Alert, CopyButton, CollapsibleSection } from '@/shared/ui';

interface ExportLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown> | null | undefined;
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
  const logText = useMemo(() => logs
    .map((log: ExportLog) => {
      const contextStr = log.context
        ? `\n    ${JSON.stringify(log.context, null, 2)}`
        : '';
      return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${contextStr}`;
    })
    .join('\n'), [logs]);

  const imagePayloadSummary = useMemo(() => {
    const entries = logs
      .map((log: ExportLog) => log.context)
      .filter((context: Record<string, unknown> | null | undefined): context is Record<string, unknown> => !!context)
      .filter((context: Record<string, unknown>) => typeof context['outputBytes'] === 'number' || typeof context['originalBytes'] === 'number' || typeof context['base64Length'] === 'number');
    if (entries.length === 0) return null;
    const sum = (key: 'outputBytes' | 'originalBytes' | 'base64Length'): number =>
      entries.reduce(
        (total: number, entry: Record<string, unknown>): number => {
          const val = entry[key];
          return total + (typeof val === 'number' ? val : 0);
        },
        0
      );
    const outputModes = new Set(
      entries
        .map((entry: Record<string, unknown>): string | null =>
          typeof entry['outputMode'] === 'string' ? (entry['outputMode']) : null
        )
        .filter((mode: string | null): mode is string => !!mode)
    );
    const outputFormats = new Set(
      entries
        .map((entry: Record<string, unknown>): string | null =>
          typeof entry['outputFormat'] === 'string' ? (entry['outputFormat']) : null
        )
        .filter((format: string | null): format is string => !!format)
    );
    const convertedCount = entries.filter((entry: Record<string, unknown>): boolean => entry['converted'] === true).length;
    const resizedCount = entries.filter((entry: Record<string, unknown>): boolean => entry['resized'] === true).length;
    return {
      count: entries.length,
      totalOriginalBytes: sum('originalBytes'),
      totalOutputBytes: sum('outputBytes'),
      totalBase64Length: sum('base64Length'),
      mode:
        outputModes.size === 1 ? Array.from(outputModes)[0] ?? null : 'mixed',
      format:
        outputFormats.size === 1
          ? Array.from(outputFormats)[0] ?? null
          : outputFormats.size > 1
            ? 'mixed'
            : null,
      convertedCount,
      resizedCount,
    };
  }, [logs]);

  if (logs.length === 0) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
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
    <CollapsibleSection
      open={isOpen}
      onOpenChange={onToggle}
      title={(
        <div className='flex items-center gap-2'>
          <span className='font-semibold text-sm text-gray-200'>
            Export Logs ({logs.length})
          </span>
        </div>
      )}
      actions={(
        <CopyButton
          value={logText}
          variant='ghost'
          size='sm'
          showText
        />
      )}
      variant='card'
      className='bg-card/40'
      headerClassName='px-4 py-3'
    >
      <div className='border-t border-border/60 px-4 py-3 bg-card/50 max-h-96 overflow-y-auto'>
        {imagePayloadSummary && (
          <div className='mb-3 rounded-md border border-border/60 bg-card/30 p-2 text-[11px] text-gray-300'>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>
              Image payload summary
            </div>
            <div className='mt-1 flex flex-wrap gap-3'>
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
        <div className='space-y-2 font-mono text-xs'>
          {logs.map((log: ExportLog, index: number) => {
            const variant =
              log.level === 'error'
                ? 'error'
                : log.level === 'warn'
                  ? 'warning'
                  : 'info';

            return (
              <Alert key={index} variant={variant} className='p-2 font-mono text-[11px] border-none bg-card/40'>
                <div className='flex justify-between items-start gap-2'>
                  <div className='flex-1'>
                    <div className='text-gray-500 opacity-70'>
                      [{log.timestamp}] <span className='font-bold'>[{log.level.toUpperCase()}]</span>
                    </div>
                    <div className='mt-1 break-words whitespace-pre-wrap text-gray-200'>
                      {log.message}
                    </div>
                    {log.context && (
                      <CollapsibleSection
                        title={<span className='text-[10px] hover:text-gray-300 transition'>Context Details</span>}
                        className='mt-2 p-0'
                        triggerClassName='p-0 hover:bg-transparent'
                        contentClassName='p-0'
                      >
                        <pre className='mt-2 p-2 bg-black/40 rounded text-[10px] overflow-x-auto text-gray-300'>
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </CollapsibleSection>
                    )}
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
}
