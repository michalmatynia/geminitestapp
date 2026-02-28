'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

import { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { AgentAuditLog, AgentBrowserLog, AgentSnapshot } from '@/shared/contracts/chatbot';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useAgentAudits,
  useAgentLogs,
  useAgentRuns,
  useAgentSnapshots,
} from '../hooks/useAgentRunsQueries';

// --- Granular Contexts ---

export interface AgentRunListData {
  agentRuns: AiPathRunRecord[];
  isLoadingRuns: boolean;
  refetchRuns: () => Promise<unknown>;
  error: Error | null;
}
const RunListContext = createContext<AgentRunListData | null>(null);
export const useAgentRunList = () => {
  const context = useContext(RunListContext);
  if (!context) throw new Error('useAgentRunList must be used within AgentRunProvider');
  return context;
};

export interface AgentRunSelectionData {
  selectedAgentRunId: string | null;
  setSelectedAgentRunId: (id: string | null) => void;
  selectedAgentRun: AiPathRunRecord | null;
}
const RunSelectionContext = createContext<AgentRunSelectionData | null>(null);
export const useAgentRunSelection = () => {
  const context = useContext(RunSelectionContext);
  if (!context) throw new Error('useAgentRunSelection must be used within AgentRunProvider');
  return context;
};

export interface AgentRunDetailData {
  agentSnapshots: AgentSnapshot[];
  agentBrowserLogs: AgentBrowserLog[];
  agentAuditLogs: AgentAuditLog[];
  agentStreamStatus: 'idle' | 'connecting' | 'live' | 'error';
  setAgentStreamStatus: (status: 'idle' | 'connecting' | 'live' | 'error') => void;
}
const RunDetailContext = createContext<AgentRunDetailData | null>(null);
export const useAgentRunDetail = () => {
  const context = useContext(RunDetailContext);
  if (!context) throw new Error('useAgentRunDetail must be used within AgentRunProvider');
  return context;
};

// --- Legacy Aggregator ---

interface AgentRunContextType extends AgentRunListData, AgentRunSelectionData, AgentRunDetailData {}

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
  const [agentStreamStatus, setAgentStreamStatus] = useState<
    'idle' | 'connecting' | 'live' | 'error'
  >('idle');

  const {
    data: agentRuns = [],
    isLoading: isLoadingRuns,
    refetch: refetchRuns,
    error: runsError,
  } = useAgentRuns();
  const { data: agentSnapshots = [], error: snapshotsError } =
    useAgentSnapshots(selectedAgentRunId);
  const { data: agentBrowserLogs = [], error: logsError } = useAgentLogs(selectedAgentRunId, {
    refetchInterval: 5000,
  });
  const { data: agentAuditLogs = [], error: auditsError } = useAgentAudits(selectedAgentRunId, {
    refetchInterval: 5000,
  });

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
        logClientError(err, {
          context: { source: 'AgentRunContext', action: 'onmessage', runId: selectedAgentRunId },
        });
        setAgentStreamStatus('error');
      }
    };

    source.onerror = (err: Event): void => {
      logClientError(err, {
        context: { source: 'AgentRunContext', action: 'onerror', runId: selectedAgentRunId },
      });
      setAgentStreamStatus('error');
      source.close();
    };

    return (): void => {
      source.close();
    };
  }, [selectedAgentRunId]);

  const listValue = useMemo<AgentRunListData>(
    () => ({
      agentRuns,
      isLoadingRuns,
      refetchRuns,
      error,
    }),
    [agentRuns, isLoadingRuns, refetchRuns, error]
  );

  const selectionValue = useMemo<AgentRunSelectionData>(
    () => ({
      selectedAgentRunId,
      setSelectedAgentRunId,
      selectedAgentRun,
    }),
    [selectedAgentRunId, selectedAgentRun]
  );

  const detailValue = useMemo<AgentRunDetailData>(
    () => ({
      agentSnapshots,
      agentBrowserLogs,
      agentAuditLogs,
      agentStreamStatus,
      setAgentStreamStatus,
    }),
    [agentSnapshots, agentBrowserLogs, agentAuditLogs, agentStreamStatus]
  );

  const aggregatedValue = useMemo(
    (): AgentRunContextType => ({
      ...listValue,
      ...selectionValue,
      ...detailValue,
    }),
    [listValue, selectionValue, detailValue]
  );

  return (
    <RunListContext.Provider value={listValue}>
      <RunSelectionContext.Provider value={selectionValue}>
        <RunDetailContext.Provider value={detailValue}>
          <AgentRunContext.Provider value={aggregatedValue}>{children}</AgentRunContext.Provider>
        </RunDetailContext.Provider>
      </RunSelectionContext.Provider>
    </RunListContext.Provider>
  );
}
