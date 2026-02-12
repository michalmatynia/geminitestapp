'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

import { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { AgentAuditLog, AgentBrowserLog, AgentSnapshot } from '@/shared/types/domain/chatbot';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
  error: Error | null;
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

  const { data: agentRuns = [], isLoading: isLoadingRuns, refetch: refetchRuns, error: runsError } = useAgentRuns();
  const { data: agentSnapshots = [], error: snapshotsError } = useAgentSnapshots(selectedAgentRunId);
  const { data: agentBrowserLogs = [], error: logsError } = useAgentLogs(selectedAgentRunId, { refetchInterval: 5000 });
  const { data: agentAuditLogs = [], error: auditsError } = useAgentAudits(selectedAgentRunId, { refetchInterval: 5000 });

  const error = runsError || snapshotsError || logsError || auditsError || null;

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
      } catch (err: unknown) {
        logClientError(err, { context: { source: 'AgentRunContext', action: 'onmessage', runId: selectedAgentRunId } });
        setAgentStreamStatus('error');
      }
    };
    
    source.onerror = (err: Event): void => {
      logClientError(err, { context: { source: 'AgentRunContext', action: 'onerror', runId: selectedAgentRunId } });
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
    error,
  }), [selectedAgentRunId, selectedAgentRun, agentRuns, agentSnapshots, agentBrowserLogs, agentAuditLogs, agentStreamStatus, setAgentStreamStatus, isLoadingRuns, refetchRuns, error]);

  return (
    <AgentRunContext.Provider value={value}>
      {children}
    </AgentRunContext.Provider>
  );
}
