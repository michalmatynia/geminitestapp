'use client';

import { useMemo } from 'react';

import { Alert, CopyButton, CollapsibleSection } from '@/shared/ui';
import { useProductListingsLogs } from '@/features/integrations/context/ProductListingsContext';

interface ExportLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown> | null | undefined;
}

interface ExportLogViewerProps {
  logs?: ExportLog[];
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function ExportLogViewer({
  logs: logsProp,
  isOpen: isOpenProp,
  onToggle: onToggleProp,
}: ExportLogViewerProps): React.JSX.Element | null {
  const contextLogs = useProductListingsLogs();

  const logs = logsProp ?? contextLogs.exportLogs ?? [];
  const isOpen = isOpenProp ?? contextLogs.logsOpen ?? true;
  const onToggle = onToggleProp ?? contextLogs.setLogsOpen;

  const logsJson = useMemo(() => JSON.stringify(logs, null, 2), [logs]);

  if (logs.length === 0) return null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400 border-red-500/20 bg-red-500/5';
      case 'warn':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'debug':
        return 'text-purple-400 border-purple-500/20 bg-purple-500/5';
      default:
        return 'text-sky-400 border-sky-500/20 bg-sky-500/5';
    }
  };

  return (
    <CollapsibleSection
      title={
        <div className='flex items-center gap-3'>
          <span className='font-semibold'>Export Telemetry</span>
          <span className='rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-gray-400'>
            {logs.length} events
          </span>
        </div>
      }
      open={isOpen}
      onOpenChange={onToggle}
      className='bg-card/20 border border-border/40 rounded-lg overflow-hidden'
    >
      <div className='p-4 space-y-4'>
        <div className='flex justify-end'>
          <CopyButton
            value={logsJson}
            variant='outline'
            size='sm'
            showText
            className='h-7 text-[10px]'
          />
        </div>

        <div className='space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar'>
          {logs.map((log, index) => {
            const levelClass = getLevelColor(log.level);
            return (
              <Alert key={index} variant='info' className={`py-2 px-3 border ${levelClass}`}>
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center justify-between gap-4'>
                    <span className='font-mono text-[10px] opacity-60'>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className='text-[9px] font-bold uppercase tracking-wider opacity-80'>
                      {log.level}
                    </span>
                  </div>
                  <div className='text-xs leading-relaxed font-medium break-words'>
                    {log.message}
                  </div>
                  <div className='mt-1'>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <CollapsibleSection
                        title='Context Data'
                        variant='subtle'
                        className='mt-1'
                        titleClassName='text-[10px] text-gray-500'
                      >
                        <pre className='mt-1 overflow-x-auto rounded bg-black/40 p-2 font-mono text-[10px] text-gray-300'>
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
