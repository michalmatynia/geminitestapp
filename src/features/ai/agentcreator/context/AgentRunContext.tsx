'use client';

import React, { useState, ReactNode, useMemo, useEffect } from 'react';

import type {
  AgentAuditLogRecordDto as AgentAuditLogRecord,
  AgentBrowserLogRecordDto as AgentBrowserLogRecord,
  AgentBrowserSnapshotRecordDto as AgentBrowserSnapshotRecord,
  AgentRunRecord,
} from '@/shared/contracts/agent-runtime';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useAgentAudits,
  useAgentLogs,
  useAgentRuns,
  useAgentSnapshots,
} from '../hooks/useAgentRunsQueries';

// --- Granular Contexts ---

export interface AgentRunListData {
  agentRuns: AgentRunRecord[];
  isLoadingRuns: boolean;
  refetchRuns: () => Promise<unknown>;
  error: Error | null;
}
const { Context: RunListContext, useStrictContext: useAgentRunList } =
  createStrictContext<AgentRunListData>({
    hookName: 'useAgentRunList',
    providerName: 'AgentRunProvider',
    displayName: 'AgentRunListContext',
    errorFactory: internalError,
  });
export { useAgentRunList };

export interface AgentRunSelectionData {
  selectedAgentRunId: string | null;
  setSelectedAgentRunId: (id: string | null) => void;
  selectedAgentRun: AgentRunRecord | null;
}
const { Context: RunSelectionContext, useStrictContext: useAgentRunSelection } =
  createStrictContext<AgentRunSelectionData>({
    hookName: 'useAgentRunSelection',
    providerName: 'AgentRunProvider',
    displayName: 'AgentRunSelectionContext',
    errorFactory: internalError,
  });
export { useAgentRunSelection };

export interface AgentRunDetailData {
  agentSnapshots: AgentBrowserSnapshotRecord[];
  agentBrowserLogs: AgentBrowserLogRecord[];
  agentAuditLogs: AgentAuditLogRecord[];
  agentStreamStatus: 'idle' | 'connecting' | 'live' | 'error';
  setAgentStreamStatus: (status: 'idle' | 'connecting' | 'live' | 'error') => void;
}
const { Context: RunDetailContext, useStrictContext: useAgentRunDetail } =
  createStrictContext<AgentRunDetailData>({
    hookName: 'useAgentRunDetail',
    providerName: 'AgentRunProvider',
    displayName: 'AgentRunDetailContext',
    errorFactory: internalError,
  });
export { useAgentRunDetail };

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
    () => agentRuns.find((run: AgentRunRecord) => run.id === selectedAgentRunId) ?? null,
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
        logClientCatch(err, {
          source: 'AgentRunContext',
          action: 'onmessage',
          runId: selectedAgentRunId,
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

  return (
    <RunListContext.Provider value={listValue}>
      <RunSelectionContext.Provider value={selectionValue}>
        <RunDetailContext.Provider value={detailValue}>{children}</RunDetailContext.Provider>
      </RunSelectionContext.Provider>
    </RunListContext.Provider>
  );
}
