// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentRunProvider, useAgentRunDetail, useAgentRunList, useAgentRunSelection } from './AgentRunContext';

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

describe('AgentRunContext', () => {
  it('throws outside the provider for all strict hooks', () => {
    expect(() => renderHook(() => useAgentRunList())).toThrow(
      'useAgentRunList must be used within AgentRunProvider'
    );
    expect(() => renderHook(() => useAgentRunSelection())).toThrow(
      'useAgentRunSelection must be used within AgentRunProvider'
    );
    expect(() => renderHook(() => useAgentRunDetail())).toThrow(
      'useAgentRunDetail must be used within AgentRunProvider'
    );
  });

  it('provides list, selection, and detail data from query hooks', () => {
    const refetchRuns = vi.fn().mockResolvedValue(undefined);

    mocks.useAgentRuns.mockReturnValue({
      data: [{ id: 'run-1', createdAt: '2026-01-01T00:00:00.000Z' }],
      isLoading: false,
      refetch: refetchRuns,
      error: null,
    });
    mocks.useAgentSnapshots.mockReturnValue({
      data: [{ id: 'snapshot-1', createdAt: '2026-01-01T00:00:01.000Z' }],
      error: null,
    });
    mocks.useAgentLogs.mockReturnValue({
      data: [{ id: 'log-1', createdAt: '2026-01-01T00:00:02.000Z' }],
      error: null,
    });
    mocks.useAgentAudits.mockReturnValue({
      data: [{ id: 'audit-1', createdAt: '2026-01-01T00:00:03.000Z' }],
      error: null,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentRunProvider>{children}</AgentRunProvider>
    );

    const { result } = renderHook(
      () => ({
        detail: useAgentRunDetail(),
        list: useAgentRunList(),
        selection: useAgentRunSelection(),
      }),
      { wrapper }
    );

    expect(result.current.list.agentRuns).toHaveLength(1);
    expect(result.current.list.refetchRuns).toBe(refetchRuns);
    expect(result.current.selection.selectedAgentRunId).toBeNull();
    expect(result.current.selection.selectedAgentRun).toBeNull();
    expect(result.current.detail.agentSnapshots).toHaveLength(1);
    expect(result.current.detail.agentBrowserLogs).toHaveLength(1);
    expect(result.current.detail.agentAuditLogs).toHaveLength(1);
    expect(result.current.detail.agentStreamStatus).toBe('idle');
  });
});
