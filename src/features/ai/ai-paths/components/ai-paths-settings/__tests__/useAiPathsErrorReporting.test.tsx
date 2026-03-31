import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  graphState: {
    activePathId: 'path-1',
    pathName: 'Primary Path',
    nodes: [{ id: 'node-1' }, { id: 'node-2' }] as Array<Record<string, unknown>>,
    edges: [{ id: 'edge-1' }] as Array<Record<string, unknown>>,
  },
  setLastError: vi.fn(),
  updateAiPathsSetting: vi.fn(),
  logClientError: vi.fn(),
  logClientCatch: vi.fn(),
  safeStringify: vi.fn((value: unknown) => JSON.stringify(value)),
}));

vi.mock('@/features/ai/ai-paths/components/context', () => ({
  useGraphState: () => mockState.graphState,
  useRuntimeActions: () => ({
    setLastError: mockState.setLastError,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  AI_PATHS_LAST_ERROR_KEY: 'ai-paths:last-error',
  safeStringify: (value: unknown) => mockState.safeStringify(value),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSetting: (...args: unknown[]) => mockState.updateAiPathsSetting(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
  logClientCatch: (...args: unknown[]) => mockState.logClientCatch(...args),
}));

import { useAiPathsErrorReporting } from '../useAiPathsErrorReporting';

describe('useAiPathsErrorReporting', () => {
  beforeEach(() => {
    mockState.graphState = {
      activePathId: 'path-1',
      pathName: 'Primary Path',
      nodes: [{ id: 'node-1' }, { id: 'node-2' }],
      edges: [{ id: 'edge-1' }],
    };
    mockState.setLastError.mockReset();
    mockState.updateAiPathsSetting.mockReset().mockResolvedValue(undefined);
    mockState.logClientError.mockReset();
    mockState.safeStringify.mockReset().mockImplementation((value: unknown) => JSON.stringify(value));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serializes persisted last error payloads and clears them with an empty string', async () => {
    const { result } = renderHook(() => useAiPathsErrorReporting('canvas'));

    await act(async () => {
      await result.current.persistLastError({
        message: 'Save failed',
        time: '2026-03-19T11:00:00.000Z',
        pathId: 'path-1',
      });
      await result.current.persistLastError(null);
    });

    expect(mockState.updateAiPathsSetting).toHaveBeenNthCalledWith(
      1,
      'ai-paths:last-error',
      '{"message":"Save failed","time":"2026-03-19T11:00:00.000Z","pathId":"path-1"}'
    );
    expect(mockState.updateAiPathsSetting).toHaveBeenNthCalledWith(2, 'ai-paths:last-error', '');
    expect(mockState.logClientError).not.toHaveBeenCalled();
  });

  it('logs persistence failures with dedicated context', async () => {
    const failure = new Error('settings store unavailable');
    mockState.updateAiPathsSetting.mockRejectedValueOnce(failure);

    const { result } = renderHook(() => useAiPathsErrorReporting('paths'));

    await act(async () => {
      await result.current.persistLastError({
        message: 'Persist me',
        time: '2026-03-19T11:05:00.000Z',
        pathId: 'path-1',
      });
    });

    expect(mockState.logClientCatch).toHaveBeenCalledTimes(1);
    expect(mockState.logClientCatch).toHaveBeenCalledWith(failure, {
      source: 'useAiPathsErrorReporting',
      action: 'persistLastError',
    });
  });

  it('reports errors by updating runtime state, persisting the payload, and logging enriched context', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:34:56.000Z'));

    const sourceError = new TypeError('Original failure:');
    sourceError.stack = 'type-stack';

    const { result } = renderHook(() => useAiPathsErrorReporting('docs'));

    act(() => {
      result.current.reportAiPathsError(sourceError, { action: 'save-path' }, 'Save failed:');
    });

    const expectedPayload = {
      message: 'Save failed',
      time: '2026-03-19T12:34:56.000Z',
      pathId: 'path-1',
    };

    expect(mockState.setLastError).toHaveBeenCalledWith(expectedPayload);

    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'ai-paths:last-error',
      JSON.stringify(expectedPayload)
    );

    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    const [loggedError, loggedMeta] = mockState.logClientError.mock.calls[0] as [Error, Record<string, unknown>];
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe('[AI Paths] Save failed');
    expect(loggedError.name).toBe('TypeError');
    expect(loggedError.stack).toBe('type-stack');
    expect(loggedMeta).toEqual({
      context: {
        feature: 'ai-paths',
        pathId: 'path-1',
        pathName: 'Primary Path',
        tab: 'docs',
        nodeCount: 2,
        edgeCount: 1,
        errorSummary: 'Save failed',
        rawMessage: 'Original failure:',
        action: 'save-path',
      },
    });
  });

  it('uses safeStringify for non-Error values when no fallback message is provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T13:00:00.000Z'));
    mockState.safeStringify.mockReturnValue('serialized payload:');

    const { result } = renderHook(() => useAiPathsErrorReporting('paths'));

    act(() => {
      result.current.reportAiPathsError({ boom: true }, { source: 'manual-test' });
    });

    expect(mockState.safeStringify).toHaveBeenCalledWith({ boom: true });
    expect(mockState.setLastError).toHaveBeenCalledWith({
      message: 'serialized payload',
      time: '2026-03-19T13:00:00.000Z',
      pathId: 'path-1',
    });

    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'ai-paths:last-error',
      '{"message":"serialized payload","time":"2026-03-19T13:00:00.000Z","pathId":"path-1"}'
    );

    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    const [loggedError, loggedMeta] = mockState.logClientError.mock.calls[0] as [Error, Record<string, unknown>];
    expect(loggedError.message).toBe('[AI Paths] serialized payload');
    expect(loggedMeta).toEqual({
      context: {
        feature: 'ai-paths',
        pathId: 'path-1',
        pathName: 'Primary Path',
        tab: 'paths',
        nodeCount: 2,
        edgeCount: 1,
        errorSummary: 'serialized payload',
        rawMessage: 'serialized payload:',
        source: 'manual-test',
      },
    });
  });
});
