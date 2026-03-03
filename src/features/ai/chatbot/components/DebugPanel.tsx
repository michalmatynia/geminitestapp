'use client';

import { LogList, JsonViewer } from '@/shared/ui';

import { useChatbotUI } from '../context/ChatbotContext';

interface LogEntry {
  id: string;
  createdAt: string | number | Date;
  level: string;
  message: string;
}

interface DebugPanelProps {
  agentRunLogs?: LogEntry[];
}

export function DebugPanel({ agentRunLogs = [] }: DebugPanelProps): React.JSX.Element {
  const { debugState } = useChatbotUI();

  return (
    <div className='h-full overflow-y-auto bg-card p-4 text-xs text-gray-300'>
      <h3 className='mb-2 font-semibold text-white'>Debug Information</h3>
      <div className='space-y-4'>
        <JsonViewer
          title='Last Request'
          data={debugState.lastRequest}
          maxHeight='200px'
          className='bg-black/40'
        />
        <JsonViewer
          title='Last Response'
          data={debugState.lastResponse}
          maxHeight='200px'
          className='bg-black/40'
        />
        <div>
          <h4 className='mb-1 font-medium text-gray-400'>Agent Logs</h4>
          <LogList
            logs={agentRunLogs.map((log) => ({
              id: log.id,
              timestamp: log.createdAt,
              level: log.level,
              message: log.message,
            }))}
            maxHeight='240px'
            className='rounded border border-border/40 bg-black/40 p-2'
          />
        </div>
      </div>
    </div>
  );
}
