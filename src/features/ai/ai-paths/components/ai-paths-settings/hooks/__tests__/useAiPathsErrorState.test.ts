import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiPathsErrorState } from '../useAiPathsErrorState';

const mockState = vi.hoisted(() => ({
  graphActions: {
    setAiPathsValidation: vi.fn(),
  },
  runtimeActions: {
    setLastError: vi.fn(),
  },
  validationArgs: [] as Array<Record<string, unknown>>,
  validationResult: {
    updateAiPathsValidation: vi.fn(),
    persistLastError: vi.fn(async (_error: string | null) => undefined),
    reportAiPathsError: vi.fn(),
  },
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => mockState.runtimeActions,
}));

vi.mock('../useAiPathsValidationActions', () => ({
  useAiPathsValidationActions: (args: Record<string, unknown>) => {
    mockState.validationArgs.push(args);
    return mockState.validationResult;
  },
}));

describe('useAiPathsErrorState', () => {
  beforeEach(() => {
    mockState.graphActions.setAiPathsValidation.mockReset();
    mockState.runtimeActions.setLastError.mockReset();
    mockState.validationArgs.length = 0;
    mockState.validationResult.updateAiPathsValidation.mockReset();
    mockState.validationResult.persistLastError.mockReset().mockResolvedValue(undefined);
    mockState.validationResult.reportAiPathsError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('wires validation actions to graph/runtime setters and exposes the validation object', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T14:00:00.000Z'));

    const toast = vi.fn();
    const sourceError = new Error('boom');
    const { result } = renderHook(() => useAiPathsErrorState({ toast }));

    expect(mockState.validationArgs).toHaveLength(1);
    const validationArgs = mockState.validationArgs[0] as {
      setAiPathsValidation: typeof mockState.graphActions.setAiPathsValidation;
      setLastError: (error: string | null) => void;
      toast: typeof toast;
    };

    expect(validationArgs.setAiPathsValidation).toBe(mockState.graphActions.setAiPathsValidation);
    expect(validationArgs.toast).toBe(toast);
    expect(result.current.validation).toBe(mockState.validationResult);

    act(() => {
      validationArgs.setLastError('Path save failed');
      validationArgs.setLastError(null);
      result.current.reportAiPathsError(sourceError, { action: 'save' }, 'Save failed');
    });

    expect(mockState.runtimeActions.setLastError).toHaveBeenNthCalledWith(1, {
      message: 'Path save failed',
      time: '2026-03-19T14:00:00.000Z',
    });
    expect(mockState.runtimeActions.setLastError).toHaveBeenNthCalledWith(2, null);
    expect(mockState.validationResult.reportAiPathsError).toHaveBeenCalledWith(
      sourceError,
      { action: 'save' },
      'Save failed'
    );
  });

  it('persists only the message portion of last-error payloads and clears with null', async () => {
    const toast = vi.fn();
    const { result } = renderHook(() => useAiPathsErrorState({ toast }));

    await act(async () => {
      await result.current.persistLastError({
        message: 'Background sync failed',
        time: '2026-03-19T14:05:00.000Z',
        pathId: 'path-7',
      });
      await result.current.persistLastError(null);
    });

    expect(mockState.validationResult.persistLastError).toHaveBeenNthCalledWith(
      1,
      'Background sync failed'
    );
    expect(mockState.validationResult.persistLastError).toHaveBeenNthCalledWith(2, null);
  });
});
