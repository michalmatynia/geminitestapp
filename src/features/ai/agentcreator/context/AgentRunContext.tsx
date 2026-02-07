'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

import { AiPathRunRecord } from '@/shared/types/ai-paths';
import { AgentAuditLog, AgentBrowserLog, AgentSnapshot } from '@/shared/types/chatbot';

import { useAgentAudits, useAgentLogs, useAgentRuns, useAgentSnapshots } from '../hooks/useAgentRunsQueries';

interface AgentRunContextType {
  selectedAgentRunId: string | null;
  setSelectedAgentRunId: (id: string | null) => void;
  selectedAgentRun: AiPathRunRecord | null;
  agentRuns: AiPathRunRecord[];
  agentSnapshots: AgentSnapshot[];
  agentBrowserLogs: AgentBrowserLog[];
  agentAuditLogs: AgentAuditLog[];
  agentStreamStatus: 'idle' | 'connecting' | 'live' | 'error';
  setAgentStreamStatus: (status: 'idle' | 'connecting' | 'live' | 'error') => void;
  isLoadingRuns: boolean;
  refetchRuns: () => Promise<unknown>;
}

const AgentRunContext = createContext<AgentRunContextType | null>(null);

export const useAgentRunContext = (): AgentRunContextType => {
  const context = useContext(AgentRunContext);
  if (!context) {
    throw new Error('useAgentRunContext must be used within an AgentRunProvider');
  }
  return context;
};

export function AgentRunProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [selectedAgentRunId, setSelectedAgentRunId] = useState<string | null>(null);
  const [agentStreamStatus, setAgentStreamStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');

  const { data: agentRuns = [], isLoading: isLoadingRuns, refetch: refetchRuns } = useAgentRuns();
  const { data: agentSnapshots = [] } = useAgentSnapshots(selectedAgentRunId);
  const { data: agentBrowserLogs = [] } = useAgentLogs(selectedAgentRunId, { refetchInterval: 5000 });
  const { data: agentAuditLogs = [] } = useAgentAudits(selectedAgentRunId, { refetchInterval: 5000 });

  const selectedAgentRun = useMemo(
    () => agentRuns.find((run: AiPathRunRecord) => run.id === selectedAgentRunId) ?? null,
    [agentRuns, selectedAgentRunId]
  );

  useEffect(() => {
    if (!selectedAgentRunId) {
      setAgentStreamStatus('idle');
      return;
    }
     
    setAgentStreamStatus('connecting');
    const source = new EventSource(`/api/agentcreator/agent/${selectedAgentRunId}/stream`);
    
    source.onmessage = (): void => {
      try {
        setAgentStreamStatus('live');
      } catch {
        setAgentStreamStatus('error');
      }
    };
    
    source.onerror = (): void => {
      setAgentStreamStatus('error');
      source.close();
    };

    return (): void => {
      source.close();
    };
  }, [selectedAgentRunId]);

  const value = useMemo((): AgentRunContextType => ({
    selectedAgentRunId,
    setSelectedAgentRunId,
    selectedAgentRun,
    agentRuns,
    agentSnapshots,
    agentBrowserLogs,
    agentAuditLogs,
    agentStreamStatus,
    setAgentStreamStatus,
    isLoadingRuns,
    refetchRuns,
  }), [selectedAgentRunId, selectedAgentRun, agentRuns, agentSnapshots, agentBrowserLogs, agentAuditLogs, agentStreamStatus, setAgentStreamStatus, isLoadingRuns, refetchRuns]);

  return (
    <AgentRunContext.Provider value={value}>
      {children}
    </AgentRunContext.Provider>
  );
}
