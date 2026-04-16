import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePaletteWithTriggerButtons } from '../usePaletteWithTriggerButtons';

const mockState = vi.hoisted(() => ({
  palette: [
    {
      type: 'trigger',
      nodeTypeId: 'base-trigger',
      title: 'Trigger: Existing',
      description: 'Base palette trigger',
      inputs: [{ id: 'base-in' }],
      outputs: [{ id: 'base-out' }],
      config: { trigger: { event: 'base' } },
    },
  ],
  derivePaletteNodeTypeId: vi.fn(
    ({ title, config }: { title: string; config: { trigger: { event: string } } }) =>
      `derived:${title}:${config.trigger.event}`
  ),
  triggerButtonsApi: {
    list: vi.fn(),
  },
  triggerButtonsQuery: {
    data: [] as Array<Record<string, unknown>>,
  },
  useQueryCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/shared/lib/ai-paths/core/definitions', () => ({
  palette: mockState.palette,
}));

vi.mock('@/shared/lib/ai-paths/core/utils/node-identity', () => ({
  derivePaletteNodeTypeId: (args: { title: string; config: { trigger: { event: string } } }) =>
    mockState.derivePaletteNodeTypeId(args),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  triggerButtonsApi: mockState.triggerButtonsApi,
}));

vi.mock('@/shared/lib/ai-paths/core/constants', () => ({
  TRIGGER_INPUT_PORTS: [{ id: 'trigger-in' }],
  TRIGGER_OUTPUT_PORTS: [{ id: 'trigger-out' }],
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: (args: Record<string, unknown>) => {
      mockState.useQueryCalls.push(args);
      return mockState.triggerButtonsQuery;
    },
  };
});

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    ai: {
      aiPaths: {
        triggerButtons: () => ['trigger-buttons'],
      },
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('usePaletteWithTriggerButtons', () => {
  beforeEach(() => {
    mockState.derivePaletteNodeTypeId.mockClear();
    mockState.triggerButtonsApi.list.mockReset();
    mockState.triggerButtonsQuery.data = [];
    mockState.useQueryCalls.length = 0;
  });

  it('configures the trigger-button query and forwards API success and failure', async () => {
    const rows = [{ id: 'btn-1', enabled: true, name: 'Fresh', display: { label: 'Fresh' } }];
    mockState.triggerButtonsApi.list.mockResolvedValueOnce({ ok: true, data: rows });
    renderHook(() => usePaletteWithTriggerButtons(), { wrapper });

    expect(mockState.useQueryCalls).toHaveLength(1);
    const queryArgs = mockState.useQueryCalls[0] as {
      queryKey: string[];
      queryFn: () => Promise<unknown>;
      enabled?: boolean;
    };

    expect(queryArgs.queryKey).toEqual(['trigger-buttons']);
    expect(queryArgs.enabled).toBe(true);
    await expect(queryArgs.queryFn()).resolves.toEqual(rows);
    expect(mockState.triggerButtonsApi.list).toHaveBeenCalledWith({ entityType: 'custom' });

    mockState.triggerButtonsApi.list.mockResolvedValueOnce({ ok: false, error: 'load failed' });
    await expect(queryArgs.queryFn()).rejects.toThrow('load failed');
  });

  it('returns the base palette when there are no trigger buttons', () => {
    mockState.triggerButtonsQuery.data = [];

    const { result } = renderHook(() => usePaletteWithTriggerButtons(), { wrapper });

    expect(result.current).toBe(mockState.palette);
    expect(mockState.derivePaletteNodeTypeId).not.toHaveBeenCalled();
  });

  it('derives unique enabled trigger nodes with label trimming and title collision handling', () => {
    mockState.triggerButtonsQuery.data = [
      { id: 'btn-1', enabled: true, name: 'Existing', display: { label: 'Existing' } },
      { id: 'btn-1', enabled: true, name: 'Duplicate Id', display: { label: 'Duplicate Id' } },
      { id: 'btn-2', enabled: true, name: '   ', display: { label: 'Existing' } },
      { id: 'btn-3', enabled: false, name: 'Disabled', display: { label: 'Disabled' } },
      { id: '', enabled: true, name: 'Missing Id', display: { label: 'Missing Id' } },
      { id: 'btn-4', enabled: true, name: '   ', display: { label: '   ' } },
      { id: 'btn-5', enabled: true, name: '  Fresh  ', display: { label: 'Ignored' } },
    ];

    const { result } = renderHook(() => usePaletteWithTriggerButtons(), { wrapper });

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'trigger',
          nodeTypeId: 'derived:Trigger: Existing (2):btn-1',
          title: 'Trigger: Existing (2)',
        }),
        expect.objectContaining({
          type: 'trigger',
          nodeTypeId: 'derived:Trigger: Existing (3):btn-2',
          title: 'Trigger: Existing (3)',
        }),
        expect.objectContaining({
          type: 'trigger',
          nodeTypeId: 'derived:Trigger: Fresh:btn-5',
          title: 'Trigger: Fresh',
        }),
      ])
    );

    expect(mockState.derivePaletteNodeTypeId).toHaveBeenCalledTimes(3);
    expect(mockState.derivePaletteNodeTypeId).toHaveBeenNthCalledWith(1, {
      type: 'trigger',
      title: 'Trigger: Existing (2)',
      config: { trigger: { event: 'btn-1' } },
    });
    expect(mockState.derivePaletteNodeTypeId).toHaveBeenNthCalledWith(2, {
      type: 'trigger',
      title: 'Trigger: Existing (3)',
      config: { trigger: { event: 'btn-2' } },
    });
    expect(mockState.derivePaletteNodeTypeId).toHaveBeenNthCalledWith(3, {
      type: 'trigger',
      title: 'Trigger: Fresh',
      config: { trigger: { event: 'btn-5' } },
    });
  });

  it('allows the trigger-button query to stay disabled while the base palette renders', () => {
    renderHook(() => usePaletteWithTriggerButtons({ enabled: false }), { wrapper });

    expect(mockState.useQueryCalls).toHaveLength(1);
    const queryArgs = mockState.useQueryCalls[0] as {
      enabled?: boolean;
    };
    expect(queryArgs.enabled).toBe(false);
  });
});
