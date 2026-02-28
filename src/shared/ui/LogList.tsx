'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { StatusBadge } from './status-badge';

export interface LogEntry {
  id: string;
  timestamp: string | number | Date;
  level: string;
  message: string;
  context?: Record<string, unknown> | null | undefined;
  source?: string | undefined;
}

interface LogListProps {
  logs: LogEntry[];
  isLoading?: boolean;
  maxHeight?: string | number;
  className?: string;
  emptyMessage?: string;
  renderContext?: (context: Record<string, unknown>) => React.ReactNode;
}

export function LogList({
  logs,
  isLoading,
  maxHeight = '400px',
  className,
  emptyMessage = 'No logs available.',
  renderContext,
}: LogListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-8 text-xs text-gray-500'>
        <div className='size-4 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2' />
        <p>Loading logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return <div className='py-8 text-center text-xs text-gray-500 italic'>{emptyMessage}</div>;
  }

  const formatTimestamp = (ts: string | number | Date): string => {
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div className={cn('space-y-2 overflow-y-auto pr-1', className)} style={{ maxHeight }}>
      {logs.map((log) => (
        <div
          key={log.id}
          className='flex flex-col gap-1 rounded-md border border-border/30 bg-black/20 p-2 text-[11px] transition-colors hover:bg-black/30'
        >
          <div className='flex items-center gap-2'>
            <span className='shrink-0 font-mono text-gray-500'>
              [{formatTimestamp(log.timestamp)}]
            </span>
            <StatusBadge status={log.level} size='sm' className='h-4 font-bold uppercase' />
            {log.source && (
              <StatusBadge
                status={log.source}
                variant='neutral'
                size='sm'
                className='h-4 px-1 font-mono uppercase opacity-70'
              />
            )}
          </div>
          <div className='break-words leading-relaxed text-gray-200'>{log.message}</div>
          {log.context && (
            <div className='mt-1'>
              {renderContext ? (
                renderContext(log.context)
              ) : (
                <pre className='max-h-32 overflow-auto rounded bg-black/40 p-1.5 font-mono text-[10px] text-gray-400'>
                  {JSON.stringify(log.context, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
