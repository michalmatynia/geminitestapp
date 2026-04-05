// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentRunsProvider,
  useAgentRunsActions,
  useAgentRunsContext,
  useAgentRunsState,
} from './AgentRunsContext';

const mocks = vi.hoisted(() => ({
  useAgentAudits: vi.fn(),
  useAgentLogs: vi.fn(),
  useAgentRuns: vi.fn(),
  useAgentSnapshots: vi.fn(),
}));

vi.mock('../hooks/useAgentRunsQueries', () => ({
  useAgentAudits: (...args: unknown[]) => mocks.useAgentAudits(...args),
  useAgentLogs: (...args: unknown[]) => mocks.useAgentLogs(...args),
  useAgentRuns: (...args: unknown[]) => mocks.useAgentRuns(...args),
  useAgentSnapshots: (...args: unknown[]) => mocks.useAgentSnapshots(...args),
}));

describe('AgentRunsContext', () => {
  it('throws outside the provider for strict hooks', () => {
    expect(() => renderHook(() => useAgentRunsState())).toThrow(
      'useAgentRunsState must be used within AgentRunsProvider'
    );
    expect(() => renderHook(() => useAgentRunsActions())).toThrow(
      'useAgentRunsActions must be used within AgentRunsProvider'
    );
  });

  it('provides merged state and actions inside the provider', async () => {
    const refetchAgentRuns = vi.fn().mockResolvedValue(undefined);

    mocks.useAgentRuns.mockReturnValue({
      data: [{ id: 'run-1', createdAt: '2026-01-01T00:00:00.000Z' }],
      isLoading: false,
      isFetching: false,
      refetch: refetchAgentRuns,
    });
    mocks.useAgentSnapshots.mockReturnValue({ data: [{ id: 'snapshot-1' }] });
    mocks.useAgentLogs.mockReturnValue({ data: [{ id: 'log-1' }] });
    mocks.useAgentAudits.mockReturnValue({ data: [{ id: 'audit-1' }] });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentRunsProvider>{children}</AgentRunsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAgentRunsActions(),
        merged: useAgentRunsContext(),
        state: useAgentRunsState(),
      }),
      { wrapper }
    );

    expect(result.current.state.agentRuns).toHaveLength(1);
    expect(result.current.state.agentSnapshots).toHaveLength(1);
    expect(result.current.state.agentBrowserLogs).toHaveLength(1);
    expect(result.current.state.agentAuditLogs).toHaveLength(1);
    expect(result.current.state.selectedAgentRun).toBeNull();
    expect(result.current.merged.refetchAgentRuns).toBeTypeOf('function');

    await act(async () => {
      result.current.actions.refetchAgentRuns();
      result.current.actions.setSelectedAgentRunId('run-1');
    });

    expect(refetchAgentRuns).toHaveBeenCalledTimes(1);
    expect(result.current.state.selectedAgentRunId).toBe('run-1');
    expect(result.current.state.selectedAgentRun?.id).toBe('run-1');
  });
});
