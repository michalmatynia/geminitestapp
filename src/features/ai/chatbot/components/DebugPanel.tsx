'use client';

import { LogList } from '@/shared/ui';

import { useChatbot } from '../context/ChatbotContext';

interface LogEntry {
  id: string;
  createdAt: string | number | Date;
  level: string;
  message: string;
}

interface DebugPanelProps {
  agentRunLogs?: LogEntry[];
}

export function DebugPanel({
  agentRunLogs = [],
}: DebugPanelProps): React.JSX.Element {
  const { debugState } = useChatbot();

  return (
    <div className='h-full overflow-y-auto bg-card p-4 text-xs text-gray-300'>
      <h3 className='mb-2 font-semibold text-white'>Debug Information</h3>
      <div className='space-y-4'>
        <div>
          <h4 className='mb-1 font-medium text-gray-400'>Last Request</h4>
          <pre className='overflow-x-auto rounded bg-gray-900 p-2'>
            {JSON.stringify(debugState.lastRequest, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className='mb-1 font-medium text-gray-400'>Last Response</h4>
          <pre className='overflow-x-auto rounded bg-gray-900 p-2'>
            {JSON.stringify(debugState.lastResponse, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className='mb-1 font-medium text-gray-400'>Agent Logs</h4>
          <LogList 
            logs={agentRunLogs.map(log => ({
              id: log.id,
              timestamp: log.createdAt,
              level: log.level,
              message: log.message,
            }))}
            maxHeight='240px'
            className='rounded bg-gray-900 p-2'
          />
        </div>
      </div>
    </div>
  );
}

