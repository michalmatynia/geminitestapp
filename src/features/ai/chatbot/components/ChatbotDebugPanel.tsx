'use client';

import React from 'react';

import { LogList, JsonViewer } from '@/shared/ui/data-display.public';

import { useChatbotUI } from '../context/ChatbotContext';

interface LogEntry {
  id: string;
  createdAt: string | number | Date;
  level: string;
  message: string;
}

interface ChatbotDebugPanelProps {
  agentRunLogs?: LogEntry[];
}

const ChatbotDebugLogsContext = React.createContext<LogEntry[] | null>(null);

function useChatbotDebugLogs(): LogEntry[] {
  const logs = React.useContext(ChatbotDebugLogsContext);
  if (!logs) {
    throw new Error('useChatbotDebugLogs must be used within ChatbotDebugLogsContext.Provider');
  }
  return logs;
}

function ChatbotDebugAgentLogs(): React.JSX.Element {
  const agentRunLogs = useChatbotDebugLogs();

  return (
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
  );
}

export function ChatbotDebugPanel({
  agentRunLogs = [],
}: ChatbotDebugPanelProps): React.JSX.Element {
  const { debugState } = useChatbotUI();
  const contextValue = React.useMemo<LogEntry[]>(() => agentRunLogs, [agentRunLogs]);

  return (
    <div className='h-full overflow-y-auto bg-card p-4 text-xs text-gray-300'>
      <h2 className='mb-2 text-sm font-semibold text-white'>Debug Information</h2>
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
          <h3 className='mb-1 text-xs font-medium text-gray-400'>Agent Logs</h3>
          <ChatbotDebugLogsContext.Provider value={contextValue}>
            <ChatbotDebugAgentLogs />
          </ChatbotDebugLogsContext.Provider>
        </div>
      </div>
    </div>
  );
}
