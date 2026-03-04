'use client';

import { useMemo } from 'react';

import { CopyButton, CollapsibleSection, LogList, type LogEntry } from '@/shared/ui';
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

  const logEntries = useMemo((): LogEntry[] => {
    return logs.map((log, index) => ({
      id: `${log.timestamp}-${index}`,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      context: log.context,
    }));
  }, [logs]);

  if (logs.length === 0) return null;

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

        <LogList logs={logEntries} maxHeight='400px' className='pr-2 custom-scrollbar' />
      </div>
    </CollapsibleSection>
  );
}
