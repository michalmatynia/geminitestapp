import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';

const {
  fireAiPathTriggerEventMock,
  subscribeToTrackedAiPathRunMock,
  useAiPathsTriggerButtonsQueryMock,
  toastMock,
} = vi.hoisted(() => ({
  fireAiPathTriggerEventMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
  useAiPathsTriggerButtonsQueryMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('./useAiPathTriggerEvent', () => ({
  useAiPathTriggerEvent: () => ({
    fireAiPathTriggerEvent: fireAiPathTriggerEventMock,
  }),
}));

vi.mock('./useAiPathQueries', () => ({
  useAiPathsTriggerButtonsQuery: (...args: unknown[]) => useAiPathsTriggerButtonsQueryMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) => subscribeToTrackedAiPathRunMock(...args),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { useTriggerButtons } from './useTriggerButtons';

const trackedRunListeners = new Map<string, (snapshot: TrackedAiPathRunSnapshot) => void>();
const emitTrackedRunSnapshot = (
  runId: string,
  patch: Partial<TrackedAiPathRunSnapshot>
): void => {
  const listener = trackedRunListeners.get(runId);
  if (!listener) {
    throw new Error(`Missing tracked run listener for ${runId}`);
  }
  listener({
    runId,
    status: 'queued',
    updatedAt: '2026-03-09T12:00:00.000Z',
    finishedAt: null,
    errorMessage: null,
    entityId: 'product-1',
    entityType: 'product',
    trackingState: 'active',
    ...patch,
  });
};

const BUTTON = {
  id: 'button-product-row',
  name: 'Trigger',
  iconId: null,
  locations: ['product_row'],
  mode: 'click',
  display: {
    label: 'Trigger',
  },
  pathId: 'path-product',
  enabled: true,
  sortIndex: 0,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
} satisfies AiTriggerButtonRecord;

describe('useTriggerButtons', () => {
  beforeEach(() => {
    fireAiPathTriggerEventMock.mockReset();
    subscribeToTrackedAiPathRunMock.mockReset();
    useAiPathsTriggerButtonsQueryMock.mockReset();
    toastMock.mockReset();
    trackedRunListeners.clear();

    useAiPathsTriggerButtonsQueryMock.mockReturnValue({
      data: [BUTTON],
      isLoading: false,
    });
    fireAiPathTriggerEventMock.mockImplementation(
      async (args: { onSuccess?: (runId: string) => void }) => {
        args.onSuccess?.('run-queued-1');
      }
    );
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (
        runId: string,
        listener: (snapshot: TrackedAiPathRunSnapshot) => void,
        options?: { initialSnapshot?: Partial<TrackedAiPathRunSnapshot> }
      ) => {
        trackedRunListeners.set(runId, listener);
        listener({
          runId,
          status: options?.initialSnapshot?.status ?? 'queued',
          updatedAt: '2026-03-09T12:00:00.000Z',
          finishedAt: null,
          errorMessage: null,
          entityId: 'product-1',
          entityType: 'product',
          trackingState: 'active',
        });
        return () => {
          trackedRunListeners.delete(runId);
        };
      }
    );
  });

  it('subscribes to shared tracked runs after a successful enqueue', async () => {
    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-queued-1',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          entityId: 'product-1',
          entityType: 'product',
          status: 'queued',
        }),
      })
    );
  });

  it('calls onRunQueued after a successful enqueue', async () => {
    const onRunQueued = vi.fn();
    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
        onRunQueued,
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(onRunQueued).toHaveBeenCalledWith({
      button: BUTTON,
      runId: 'run-queued-1',
      entityId: 'product-1',
      entityType: 'product',
    });
  });

  it('derives the queued product identity from the entity snapshot when entityId is missing', async () => {
    const modalButton = {
      ...BUTTON,
      id: 'button-product-modal',
      locations: ['product_modal'],
    } satisfies AiTriggerButtonRecord;
    const onRunQueued = vi.fn();
    const getEntityJson = vi.fn(() => ({
      _id: ' product-from-snapshot ',
      name_en: 'Snapshot product',
    }));

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_modal',
        entityType: 'product',
        getEntityJson,
        onRunQueued,
      })
    );

    await act(async () => {
      await result.current.handleTrigger(modalButton, { mode: 'click' });
    });

    expect(getEntityJson).toHaveBeenCalledTimes(1);
    expect(fireAiPathTriggerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'product-from-snapshot',
      })
    );
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-queued-1',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          entityId: 'product-from-snapshot',
          entityType: 'product',
          status: 'queued',
        }),
      })
    );
    expect(onRunQueued).toHaveBeenCalledWith({
      button: modalButton,
      runId: 'run-queued-1',
      entityId: 'product-from-snapshot',
      entityType: 'product',
    });
  });

  it('filters out buttons that do not match the requested location', () => {
    const otherButton = {
      ...BUTTON,
      id: 'button-admin',
      locations: ['admin_dashboard'],
    } as AiTriggerButtonRecord;
    useAiPathsTriggerButtonsQueryMock.mockReturnValue({
      data: [BUTTON, otherButton],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
      })
    );

    expect(result.current.buttons).toHaveLength(1);
    expect(result.current.buttons[0].id).toBe('button-product-row');
  });

  it('filters out disabled buttons', () => {
    const disabledButton = {
      ...BUTTON,
      id: 'button-disabled',
      enabled: false,
    } as AiTriggerButtonRecord;
    useAiPathsTriggerButtonsQueryMock.mockReturnValue({
      data: [BUTTON, disabledButton],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
      })
    );

    expect(result.current.buttons).toHaveLength(1);
    expect(result.current.buttons[0].id).toBe('button-product-row');
  });

  it('deduplicates buttons with the same id', () => {
    useAiPathsTriggerButtonsQueryMock.mockReturnValue({
      data: [BUTTON, { ...BUTTON }],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
      })
    );

    expect(result.current.buttons).toHaveLength(1);
  });

  it('does not call onRunQueued when fireAiPathTriggerEvent rejects', async () => {
    fireAiPathTriggerEventMock.mockRejectedValue(new Error('network error'));
    const onRunQueued = vi.fn();

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
        onRunQueued,
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(onRunQueued).not.toHaveBeenCalled();
  });

  it('resets runState to idle after trigger completes', async () => {
    fireAiPathTriggerEventMock.mockImplementation(
      async (args: {
        onSuccess?: (runId: string) => void;
        onProgress?: (p: { status: string; progress: number }) => void;
      }) => {
        args.onProgress?.({ status: 'running', progress: 0.5 });
        args.onProgress?.({ status: 'success', progress: 1 });
        args.onSuccess?.('run-done-1');
      }
    );

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(result.current.runStates[BUTTON.id]?.status).toBe('idle');
  });

  it('tracks the latest run status with fresh polling after enqueue', async () => {
    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    act(() => {
      emitTrackedRunSnapshot('run-queued-1', {
        status: 'completed',
        updatedAt: '2026-03-09T12:00:05.000Z',
        finishedAt: '2026-03-09T12:00:05.000Z',
        trackingState: 'stopped',
      });
    });

    await waitFor(() => {
      expect(result.current.lastRuns[BUTTON.id]).toMatchObject({
        runId: 'run-queued-1',
        status: 'completed',
        finishedAt: '2026-03-09T12:00:05.000Z',
      });
    });
  });

  it('toasts a warning and aborts the trigger when entity context resolves no id', async () => {
    const getEntityJson = vi.fn(() => ({ name_en: 'No ID product' })); // no id/_id/productId

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_modal',
        entityType: 'product',
        getEntityJson,
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(fireAiPathTriggerEventMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Could not resolve entity ID for this AI Path trigger. Ensure the product has a valid ID.',
      { variant: 'warning' }
    );
  });

  it('does not apply the null entity guard for custom entityType', async () => {
    // 'custom' triggers are allowed to fire without a resolved entityId
    const getEntityJson = vi.fn(() => ({ name_en: 'No ID custom entity' }));

    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'custom',
        getEntityJson,
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    expect(fireAiPathTriggerEventMock).toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.stringContaining('Could not resolve entity ID'),
      expect.anything()
    );
  });

  it('surfaces the primary terminal failure summary from run details', async () => {
    const { result } = renderHook(() =>
      useTriggerButtons({
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
      })
    );

    await act(async () => {
      await result.current.handleTrigger(BUTTON, { mode: 'click' });
    });

    act(() => {
      emitTrackedRunSnapshot('run-queued-1', {
        status: 'failed',
        updatedAt: '2026-03-09T12:00:05.000Z',
        finishedAt: '2026-03-09T12:00:05.000Z',
        errorMessage: 'Database write affected 0 records for update.',
        trackingState: 'stopped',
      });
    });

    await waitFor(() => {
      expect(result.current.lastRuns[BUTTON.id]).toMatchObject({
        status: 'failed',
        errorMessage: 'Database write affected 0 records for update.',
      });
    });
  });
});
