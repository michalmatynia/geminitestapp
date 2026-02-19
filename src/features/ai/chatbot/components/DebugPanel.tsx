'use client';

import { StatusBadge } from '@/shared/ui';
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
          <div className='max-h-60 overflow-y-auto rounded bg-gray-900 p-2'>
            {agentRunLogs.map((log: LogEntry): React.JSX.Element => (
              <div key={log.id} className='mb-2 border-b border-border pb-2'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className='text-gray-500'>
                    [{new Date(log.createdAt).toLocaleTimeString()}]
                  </span>
                  <StatusBadge 
                    status={log.level} 
                    size='sm' 
                    className='h-4 font-bold uppercase' 
                  />
                </div>
                <div className='text-gray-300 leading-relaxed'>
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

