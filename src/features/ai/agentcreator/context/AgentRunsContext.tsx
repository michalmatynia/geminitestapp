'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type {
  AgentAuditLog,
  AgentBrowserLog,
  AgentSnapshot,
} from '@/shared/contracts/chatbot';
import { useAgentAudits, useAgentLogs, useAgentRuns, useAgentSnapshots } from '../hooks/useAgentRunsQueries';

export interface AgentRunsContextValue {
  // Runs List
  agentRuns: AiPathRunRecord[];
  isAgentRunsLoading: boolean;
  isAgentRunsFetching: boolean;
  refetchAgentRuns: () => void;
  
  // Selection & Details
  selectedAgentRunId: string | null;
  setSelectedAgentRunId: (id: string | null) => void;
  selectedAgentRun: AiPathRunRecord | null;
  
  // Run Data
  agentSnapshots: AgentSnapshot[];
  agentBrowserLogs: AgentBrowserLog[];
  agentAuditLogs: AgentAuditLog[];
  agentStreamStatus: string;
}

const AgentRunsContext = createContext<AgentRunsContextValue | null>(null);

export function AgentRunsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [selectedAgentRunId, setSelectedAgentRunId] = useState<string | null>(null);

  const agentRunsQuery = useAgentRuns();
  const agentRuns = agentRunsQuery.data ?? [];

  const {
    isLoading: isAgentRunsLoading,
    isFetching: isAgentRunsFetching,
    refetch: refetchAgentRuns,
  } = agentRunsQuery;

  const selectedAgentRun = useMemo(
    () => agentRuns.find((run: AiPathRunRecord) => run.id === selectedAgentRunId) ?? null,
    [agentRuns, selectedAgentRunId]
  );

  const snapshotsQuery = useAgentSnapshots(selectedAgentRunId);
  const agentSnapshots = useMemo(() => snapshotsQuery.data ?? [], [snapshotsQuery.data]);

  const logsQuery = useAgentLogs(selectedAgentRunId);
  const agentBrowserLogs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const auditsQuery = useAgentAudits(selectedAgentRunId);
  const agentAuditLogs = useMemo(() => auditsQuery.data ?? [], [auditsQuery.data]);

  const agentStreamStatus = 'idle';

  const contextValue: AgentRunsContextValue = useMemo(
    () => ({
      agentRuns,
      isAgentRunsLoading,
      isAgentRunsFetching,
      refetchAgentRuns: () => void refetchAgentRuns(),
      selectedAgentRunId,
      setSelectedAgentRunId,
      selectedAgentRun,
      agentSnapshots,
      agentBrowserLogs,
      agentAuditLogs,
      agentStreamStatus,
    }),
    [
      agentRuns,
      isAgentRunsLoading,
      isAgentRunsFetching,
      refetchAgentRuns,
      selectedAgentRunId,
      selectedAgentRun,
      agentSnapshots,
      agentBrowserLogs,
      agentAuditLogs,
      agentStreamStatus,
    ]
  );

  return (
    <AgentRunsContext.Provider value={contextValue}>
      {children}
    </AgentRunsContext.Provider>
  );
}

export function useAgentRunsContext(): AgentRunsContextValue {
  const context = useContext(AgentRunsContext);
  if (!context) {
    throw new Error('useAgentRunsContext must be used within AgentRunsProvider');
  }
  return context;
}
