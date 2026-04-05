'use client';

import React from 'react';

import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';

import { ExportLogViewer } from './ExportLogViewer';

type ExportLogsPanelProps = {
  logs: CapturedLog[];
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
};

export function ExportLogsPanel({
  logs,
  isOpen,
  onToggle,
}: ExportLogsPanelProps): React.JSX.Element | null {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className='mt-4 border-t border pt-4'>
      <ExportLogViewer logs={logs} isOpen={isOpen} onToggle={onToggle} />
    </div>
  );
}
