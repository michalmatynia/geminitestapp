// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentTeachingCollectionsProvider,
  useAgentTeachingCollectionsContext,
} from './AgentTeachingCollectionsContext';

const mocks = vi.hoisted(() => ({
  logClientError: vi.fn(),
  toast: vi.fn(),
  useAgentTeachingQueriesContext: vi.fn(),
  useDeleteEmbeddingCollectionMutation: vi.fn(),
  useUpsertEmbeddingCollectionMutation: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('./AgentTeachingContext', () => ({
  useAgentTeachingQueriesContext: (...args: unknown[]) =>
    mocks.useAgentTeachingQueriesContext(...args),
}));

vi.mock('../hooks/useAgentTeachingQueries', () => ({
  useDeleteEmbeddingCollectionMutation: (...args: unknown[]) =>
    mocks.useDeleteEmbeddingCollectionMutation(...args),
  useUpsertEmbeddingCollectionMutation: (...args: unknown[]) =>
    mocks.useUpsertEmbeddingCollectionMutation(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mocks.logClientError(...args),
}));

describe('AgentTeachingCollectionsContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useAgentTeachingCollectionsContext())).toThrow(
      'useAgentTeachingCollectionsContext must be used within AgentTeachingCollectionsProvider'
    );
  });

  it('derives modal draft values and collection usage counts', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);

    mocks.useAgentTeachingQueriesContext.mockReturnValue({
      collections: [{ id: 'collection-1', name: 'Math', embeddingModel: 'text-embedding-3-large' }],
      agents: [
        { id: 'agent-1', collectionIds: ['collection-1'] },
        { id: 'agent-2', collectionIds: ['collection-1'] },
      ],
      embeddingModelId: ' text-embedding-3-large ',
      isLoading: false,
    });
    mocks.useUpsertEmbeddingCollectionMutation.mockReturnValue({
      mutateAsync: upsert,
      isPending: false,
    });
    mocks.useDeleteEmbeddingCollectionMutation.mockReturnValue({
      mutateAsync: remove,
      isPending: false,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentTeachingCollectionsProvider>{children}</AgentTeachingCollectionsProvider>
    );

    const { result } = renderHook(() => useAgentTeachingCollectionsContext(), { wrapper });

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.draft.embeddingModel).toBe('text-embedding-3-large');
    expect(result.current.getUsedByCount('collection-1')).toBe(2);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.toast).toHaveBeenCalledWith('Collection name is required.', {
      variant: 'error',
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
