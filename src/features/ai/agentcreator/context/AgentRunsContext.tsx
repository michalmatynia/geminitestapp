'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { AgentAuditLog, AgentBrowserLog, AgentSnapshot } from '@/shared/contracts/chatbot';
import { internalError } from '@/shared/errors/app-error';

import {
  useAgentAudits,
  useAgentLogs,
  useAgentRuns,
  useAgentSnapshots,
} from '../hooks/useAgentRunsQueries';

export interface AgentRunsContextValue {
  agentRuns: AiPathRunRecord[];
  isAgentRunsLoading: boolean;
  isAgentRunsFetching: boolean;
  selectedAgentRunId: string | null;
  selectedAgentRun: AiPathRunRecord | null;
  agentSnapshots: AgentSnapshot[];
  agentBrowserLogs: AgentBrowserLog[];
  agentAuditLogs: AgentAuditLog[];
  agentStreamStatus: string;
}

export interface AgentRunsActionsContextValue {
  refetchAgentRuns: () => void;
  setSelectedAgentRunId: (id: string | null) => void;
}

const AgentRunsStateContext = createContext<AgentRunsContextValue | null>(null);
const AgentRunsActionsContext = createContext<AgentRunsActionsContextValue | null>(null);

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

  const stateValue: AgentRunsContextValue = useMemo(
    () => ({
      agentRuns,
      isAgentRunsLoading,
      isAgentRunsFetching,
      selectedAgentRunId,
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
  const actionsValue: AgentRunsActionsContextValue = useMemo(
    () => ({
      refetchAgentRuns: () => {
        void refetchAgentRuns();
      },
      setSelectedAgentRunId,
    }),
    [refetchAgentRuns]
  );

  return (
    <AgentRunsActionsContext.Provider value={actionsValue}>
      <AgentRunsStateContext.Provider value={stateValue}>{children}</AgentRunsStateContext.Provider>
    </AgentRunsActionsContext.Provider>
  );
}

export function useAgentRunsState(): AgentRunsContextValue {
  const context = useContext(AgentRunsStateContext);
  if (!context) {
    throw internalError('useAgentRunsState must be used within AgentRunsProvider');
  }
  return context;
}

export function useAgentRunsActions(): AgentRunsActionsContextValue {
  const context = useContext(AgentRunsActionsContext);
  if (!context) {
    throw internalError('useAgentRunsActions must be used within AgentRunsProvider');
  }
  return context;
}

export function useAgentRunsContext(): AgentRunsContextValue & AgentRunsActionsContextValue {
  const state = useAgentRunsState();
  const actions = useAgentRunsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
