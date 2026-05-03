'use client';

import React from 'react';

import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';

import { ExportLogViewer } from './ExportLogViewer';

type ExportLogsPanelDisplayConfig = {
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
};

type ExportLogsPanelProps = {
  logs: CapturedLog[];
  config?: ExportLogsPanelDisplayConfig;
};

export function ExportLogsPanel({
  logs,
  config = {},
}: ExportLogsPanelProps): React.JSX.Element | null {
  const { isOpen, onToggle } = config;

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className='mt-4 border-t border pt-4'>
      <ExportLogViewer logs={logs} isOpen={isOpen} onToggle={onToggle} />
    </div>
  );
}
