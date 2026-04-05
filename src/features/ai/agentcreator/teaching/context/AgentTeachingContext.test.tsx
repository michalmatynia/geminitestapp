// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentTeachingProvider,
  useAgentTeachingActions,
  useAgentTeachingQueriesContext,
  useAgentTeachingState,
} from './AgentTeachingContext';

const mocks = vi.hoisted(() => ({
  useBrainAssignment: vi.fn(),
  useTeachingAgents: vi.fn(),
  useTeachingCollections: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: (...args: unknown[]) => mocks.useBrainAssignment(...args),
}));

vi.mock('../hooks/useAgentTeachingQueries', () => ({
  useTeachingAgents: (...args: unknown[]) => mocks.useTeachingAgents(...args),
  useTeachingCollections: (...args: unknown[]) => mocks.useTeachingCollections(...args),
}));

describe('AgentTeachingContext', () => {
  it('throws outside the provider for strict hooks', () => {
    expect(() => renderHook(() => useAgentTeachingState())).toThrow(
      'useAgentTeachingState must be used within an AgentTeachingProvider'
    );
    expect(() => renderHook(() => useAgentTeachingActions())).toThrow(
      'useAgentTeachingActions must be used within an AgentTeachingProvider'
    );
  });

  it('provides trimmed assignments, records, and refetch actions', () => {
    const refetchAgents = vi.fn().mockResolvedValue(undefined);
    const refetchCollections = vi.fn().mockResolvedValue(undefined);

    mocks.useTeachingAgents.mockReturnValue({
      data: [{ id: 'agent-1' }],
      isLoading: false,
      refetch: refetchAgents,
    });
    mocks.useTeachingCollections.mockReturnValue({
      data: [{ id: 'collection-1' }],
      isLoading: false,
      refetch: refetchCollections,
    });
    mocks.useBrainAssignment
      .mockReturnValueOnce({ effectiveModelId: ' gpt-5.4 ' })
      .mockReturnValueOnce({ effectiveModelId: ' text-embedding-3-large ' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentTeachingProvider>{children}</AgentTeachingProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAgentTeachingActions(),
        merged: useAgentTeachingQueriesContext(),
        state: useAgentTeachingState(),
      }),
      { wrapper }
    );

    expect(result.current.state.chatModelId).toBe('gpt-5.4');
    expect(result.current.state.embeddingModelId).toBe('text-embedding-3-large');
    expect(result.current.state.agents).toHaveLength(1);
    expect(result.current.state.collections).toHaveLength(1);
    expect(result.current.merged.refetchAgents).toBe(refetchAgents);
    expect(result.current.actions.refetchCollections).toBe(refetchCollections);
  });
});
