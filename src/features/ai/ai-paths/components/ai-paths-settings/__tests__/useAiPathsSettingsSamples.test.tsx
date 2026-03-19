import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  parserPending: false,
  updaterPending: false,
  setParserSamples: vi.fn(),
  setUpdaterSamples: vi.fn(),
  getProduct: vi.fn(),
  getNote: vi.fn(),
  dbQuery: vi.fn(),
  fetchQueryCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ id: 'query-client' }),
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setParserSamples: mockState.setParserSamples,
    setUpdaterSamples: mockState.setUpdaterSamples,
  }),
}));

vi.mock('@/shared/lib/product-query-keys', () => ({
  getProductDetailQueryKey: (id: string) => ['product', id],
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  dbApi: {
    query: (...args: unknown[]) => mockState.dbQuery(...args),
  },
  entityApi: {
    getProduct: (...args: unknown[]) => mockState.getProduct(...args),
    getNote: (...args: unknown[]) => mockState.getNote(...args),
  },
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createMutationV2: (config: {
    mutationKey?: unknown;
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (data: unknown, variables: unknown) => void;
    onError?: (error: Error, variables: unknown) => void;
  }) => {
    const serializedKey = JSON.stringify(config.mutationKey ?? '');
    const isParser = serializedKey.includes('fetch-parser-sample');
    return {
      isPending: isParser ? mockState.parserPending : mockState.updaterPending,
      mutateAsync: async (variables: unknown) => {
        try {
          const result = await config.mutationFn(variables);
          config.onSuccess?.(result, variables);
          return result;
        } catch (error) {
          config.onError?.(error as Error, variables);
          throw error;
        }
      },
    };
  },
  fetchQueryV2: (_queryClient: unknown, options: Record<string, unknown>) => {
    mockState.fetchQueryCalls.push(options);
    return async () => {
      const queryFn = options.queryFn as () => Promise<unknown>;
      return await queryFn();
    };
  },
}));

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    ai: {
      aiPaths: {
        mutation: (key: string) => ['ai-paths', key],
      },
    },
    notes: {
      detail: (id: string) => ['note', id],
    },
  },
}));

import { useAiPathsSettingsSamples } from '../useAiPathsSettingsSamples';

describe('useAiPathsSettingsSamples', () => {
  beforeEach(() => {
    mockState.parserPending = false;
    mockState.updaterPending = false;
    mockState.setParserSamples.mockReset();
    mockState.setUpdaterSamples.mockReset();
    mockState.getProduct.mockReset();
    mockState.getNote.mockReset();
    mockState.dbQuery.mockReset();
    mockState.fetchQueryCalls.length = 0;
  });

  it('exposes parser and updater loading flags from the mutations', () => {
    mockState.parserPending = true;
    mockState.updaterPending = true;

    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast: vi.fn() }));

    expect(result.current.parserSampleLoading).toBe(true);
    expect(result.current.updaterSampleLoading).toBe(true);
  });

  it('fetches a parser sample for products and stores defaults when no prior sample exists', async () => {
    mockState.getProduct.mockResolvedValue({ ok: true, data: { id: 'prod-1', title: 'Bag' } });
    const toast = vi.fn();
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await act(async () => {
      await result.current.handleFetchParserSample('node-1', 'products', 'prod-1');
    });

    expect(mockState.getProduct).toHaveBeenCalledWith('prod-1');
    expect(mockState.fetchQueryCalls[0]?.queryKey).toEqual(['product', 'prod-1']);
    const updater = mockState.setParserSamples.mock.calls[0]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    expect(updater({})).toEqual({
      'node-1': {
        entityType: 'products',
        entityId: 'prod-1',
        json: JSON.stringify({ id: 'prod-1', title: 'Bag' }, null, 2),
        mappingMode: 'top',
        depth: 2,
        keyStyle: 'path',
        includeContainers: false,
      },
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('fetches a parser sample for notes and preserves prior parser sample settings', async () => {
    mockState.getNote.mockResolvedValue({ ok: true, data: { id: 'note-1', text: 'hello' } });
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast: vi.fn() }));

    await act(async () => {
      await result.current.handleFetchParserSample('node-9', 'notes', 'note-1');
    });

    expect(mockState.getNote).toHaveBeenCalledWith('note-1');
    expect(mockState.fetchQueryCalls[0]?.queryKey).toEqual(['note', 'note-1']);
    const updater = mockState.setParserSamples.mock.calls[0]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    expect(
      updater({
        'node-9': {
          mappingMode: 'nested',
          depth: 4,
          keyStyle: 'label',
          includeContainers: true,
        },
      })
    ).toEqual({
      'node-9': {
        entityType: 'notes',
        entityId: 'note-1',
        json: JSON.stringify({ id: 'note-1', text: 'hello' }, null, 2),
        mappingMode: 'nested',
        depth: 4,
        keyStyle: 'label',
        includeContainers: true,
      },
    });
  });

  it('surfaces parser-sample validation and missing-sample errors through toast messages', async () => {
    const toast = vi.fn();
    mockState.getProduct.mockResolvedValue({ ok: false, data: null });
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await expect(
      result.current.handleFetchParserSample('node-1', 'products', '   ')
    ).rejects.toThrow('Enter an entity ID to load a sample.');
    await expect(
      result.current.handleFetchParserSample('node-1', 'custom', 'abc')
    ).rejects.toThrow('Use pasted JSON for custom samples.');
    await expect(
      result.current.handleFetchParserSample('node-1', 'product', 'missing-1')
    ).rejects.toThrow('No sample found for that ID.');

    expect(toast).toHaveBeenNthCalledWith(1, 'Enter an entity ID to load a sample.', {
      variant: 'error',
    });
    expect(toast).toHaveBeenNthCalledWith(2, 'Use pasted JSON for custom samples.', {
      variant: 'error',
    });
    expect(toast).toHaveBeenNthCalledWith(3, 'No sample found for that ID.', {
      variant: 'error',
    });
  });

  it('handles updater custom samples and generic empty results with error toasts', async () => {
    const toast = vi.fn();
    mockState.dbQuery.mockResolvedValue({ ok: true, data: { items: [] } });
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await act(async () => {
      await result.current.handleFetchUpdaterSample('node-1', 'custom', 'sample-id');
      await result.current.handleFetchUpdaterSample('node-2', 'orders', 'missing-id');
    });

    expect(toast).toHaveBeenNthCalledWith(1, 'Use pasted JSON for custom samples.', {
      variant: 'error',
    });
    expect(toast).toHaveBeenNthCalledWith(2, 'No sample found.', { variant: 'error' });
    expect(mockState.setUpdaterSamples).not.toHaveBeenCalled();
  });

  it('fetches updater samples via db lookup, resolves fetched ids, and preserves prior settings', async () => {
    mockState.dbQuery.mockResolvedValue({
      ok: true,
      data: { items: [{ _id: '507f1f77bcf86cd799439011', title: 'DB Sample' }] },
    });
    const toast = vi.fn();
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await act(async () => {
      await result.current.handleFetchUpdaterSample('node-3', 'orders', '', { notify: true });
    });

    expect(mockState.dbQuery).toHaveBeenCalledWith({
      provider: 'auto',
      collection: 'orders',
      filter: {},
      single: true,
      limit: 1,
      idType: 'string',
    });
    const updater = mockState.setUpdaterSamples.mock.calls[0]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    expect(
      updater({
        'node-3': {
          mappingMode: 'nested',
          depth: 5,
          keyStyle: 'label',
          includeContainers: true,
        },
      })
    ).toEqual({
      'node-3': {
        entityType: 'orders',
        entityId: '507f1f77bcf86cd799439011',
        json: JSON.stringify({ _id: '507f1f77bcf86cd799439011', title: 'DB Sample' }, null, 2),
        mappingMode: 'nested',
        depth: 5,
        keyStyle: 'label',
        includeContainers: true,
      },
    });
    expect(toast).toHaveBeenCalledWith('Sample fetched.', { variant: 'success' });
  });

  it('tries both string and objectId db lookups for updater samples when the id looks like an ObjectId', async () => {
    mockState.dbQuery
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, data: { item: { _id: '507f1f77bcf86cd799439011', ok: true } } });
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast: vi.fn() }));

    await act(async () => {
      await result.current.handleFetchUpdaterSample(
        'node-4',
        'orders',
        '507f1f77bcf86cd799439011'
      );
    });

    expect(mockState.dbQuery).toHaveBeenNthCalledWith(1, {
      provider: 'auto',
      collection: 'orders',
      filter: { id: '507f1f77bcf86cd799439011' },
      single: true,
      limit: 1,
      idType: 'string',
    });
    expect(mockState.dbQuery).toHaveBeenNthCalledWith(2, {
      provider: 'auto',
      collection: 'orders',
      filter: { _id: '507f1f77bcf86cd799439011' },
      single: true,
      limit: 1,
      idType: 'objectId',
    });
  });

  it('fetches updater product samples and skips success toast when notify is false', async () => {
    mockState.getProduct.mockResolvedValue({ ok: true, data: { id: 'prod-7', name: 'Lamp' } });
    const toast = vi.fn();
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await act(async () => {
      await result.current.handleFetchUpdaterSample('node-5', 'product', 'prod-7', {
        notify: false,
      });
    });

    expect(mockState.getProduct).toHaveBeenCalledWith('prod-7');
    expect(mockState.fetchQueryCalls[0]?.queryKey).toEqual(['product', 'prod-7']);
    expect(toast).not.toHaveBeenCalled();
  });

  it('suppresses updater error toasts when notify is false', async () => {
    const failure = new Error('note fetch failed');
    mockState.getNote.mockRejectedValue(failure);
    const toast = vi.fn();
    const { result } = renderHook(() => useAiPathsSettingsSamples({ toast }));

    await expect(
      result.current.handleFetchUpdaterSample('node-6', 'note', 'note-6', { notify: false })
    ).rejects.toThrow('note fetch failed');

    expect(mockState.getNote).toHaveBeenCalledWith('note-6');
    expect(toast).not.toHaveBeenCalled();
  });
});
