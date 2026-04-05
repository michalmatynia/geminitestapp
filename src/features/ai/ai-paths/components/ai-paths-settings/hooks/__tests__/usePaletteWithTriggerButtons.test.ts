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
  createListQueryCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  palette: mockState.palette,
  derivePaletteNodeTypeId: (args: { title: string; config: { trigger: { event: string } } }) =>
    mockState.derivePaletteNodeTypeId(args),
  TRIGGER_INPUT_PORTS: [{ id: 'trigger-in' }],
  TRIGGER_OUTPUT_PORTS: [{ id: 'trigger-out' }],
  triggerButtonsApi: mockState.triggerButtonsApi,
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (args: Record<string, unknown>) => {
    mockState.createListQueryCalls.push(args);
    return mockState.triggerButtonsQuery;
  },
}));

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    ai: {
      aiPaths: {
        triggerButtons: () => ['trigger-buttons'],
      },
    },
  },
}));

describe('usePaletteWithTriggerButtons', () => {
  beforeEach(() => {
    mockState.derivePaletteNodeTypeId.mockClear();
    mockState.triggerButtonsApi.list.mockReset();
    mockState.triggerButtonsQuery.data = [];
    mockState.createListQueryCalls.length = 0;
  });

  it('configures the trigger-button query and forwards API success and failure', async () => {
    const rows = [{ id: 'btn-1', enabled: true, name: 'Fresh', display: { label: 'Fresh' } }];
    mockState.triggerButtonsApi.list.mockResolvedValueOnce({ ok: true, data: rows });
    renderHook(() => usePaletteWithTriggerButtons());

    expect(mockState.createListQueryCalls).toHaveLength(1);
    const queryArgs = mockState.createListQueryCalls[0] as {
      queryKey: string[];
      queryFn: () => Promise<unknown>;
      enabled?: boolean;
      meta: Record<string, unknown>;
    };

    expect(queryArgs.queryKey).toEqual(['trigger-buttons']);
    expect(queryArgs.enabled).toBe(true);
    expect(queryArgs.meta).toEqual({
      source: 'ai.ai-paths.settings.trigger-buttons',
      operation: 'list',
      resource: 'aiPaths.triggerButtons',
      domain: 'global',
      description: 'Loads ai paths trigger buttons.',
    });
    await expect(queryArgs.queryFn()).resolves.toEqual(rows);
    expect(mockState.triggerButtonsApi.list).toHaveBeenCalledWith({ entityType: 'custom' });

    mockState.triggerButtonsApi.list.mockResolvedValueOnce({ ok: false, error: 'load failed' });
    await expect(queryArgs.queryFn()).rejects.toThrow('load failed');
  });

  it('returns the base palette when there are no trigger buttons', () => {
    mockState.triggerButtonsQuery.data = [];

    const { result } = renderHook(() => usePaletteWithTriggerButtons());

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

    const { result } = renderHook(() => usePaletteWithTriggerButtons());

    expect(result.current).toEqual([
      mockState.palette[0],
      {
        type: 'trigger',
        nodeTypeId: 'derived:Trigger: Existing (2):btn-1',
        title: 'Trigger: Existing (2)',
        description: 'User trigger button: Existing (btn-1).',
        inputs: [{ id: 'trigger-in' }],
        outputs: [{ id: 'trigger-out' }],
        config: { trigger: { event: 'btn-1' } },
      },
      {
        type: 'trigger',
        nodeTypeId: 'derived:Trigger: Existing (3):btn-2',
        title: 'Trigger: Existing (3)',
        description: 'User trigger button: Existing (btn-2).',
        inputs: [{ id: 'trigger-in' }],
        outputs: [{ id: 'trigger-out' }],
        config: { trigger: { event: 'btn-2' } },
      },
      {
        type: 'trigger',
        nodeTypeId: 'derived:Trigger: Fresh:btn-5',
        title: 'Trigger: Fresh',
        description: 'User trigger button: Fresh (btn-5).',
        inputs: [{ id: 'trigger-in' }],
        outputs: [{ id: 'trigger-out' }],
        config: { trigger: { event: 'btn-5' } },
      },
    ]);

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
    renderHook(() => usePaletteWithTriggerButtons({ enabled: false }));

    expect(mockState.createListQueryCalls).toHaveLength(1);
    const queryArgs = mockState.createListQueryCalls[0] as {
      enabled?: boolean;
    };
    expect(queryArgs.enabled).toBe(false);
  });
});
