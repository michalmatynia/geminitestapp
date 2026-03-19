import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiPathsValidationActions } from '../useAiPathsValidationActions';

const mockState = vi.hoisted(() => ({
  normalizeAiPathsValidationConfig: vi.fn((value: unknown) => ({
    normalized: true,
    source: value,
  })),
  logClientError: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  AI_PATHS_LAST_ERROR_KEY: 'ai-paths:last-error',
  normalizeAiPathsValidationConfig: (...args: unknown[]) =>
    mockState.normalizeAiPathsValidationConfig(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

describe('useAiPathsValidationActions', () => {
  beforeEach(() => {
    mockState.normalizeAiPathsValidationConfig.mockReset().mockImplementation((value: unknown) => ({
      normalized: true,
      source: value,
    }));
    mockState.logClientError.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes validation patches before applying them', () => {
    const setAiPathsValidation = vi.fn();

    const { result } = renderHook(() =>
      useAiPathsValidationActions({
        setAiPathsValidation,
        setLastError: vi.fn(),
        toast: vi.fn(),
      })
    );

    act(() => {
      result.current.updateAiPathsValidation({ enabled: false });
    });

    expect(mockState.normalizeAiPathsValidationConfig).toHaveBeenCalledWith({ enabled: false });
    expect(setAiPathsValidation).toHaveBeenCalledWith({
      normalized: true,
      source: { enabled: false },
    });
  });

  it('persists and clears last-error values through runtime state and localStorage', async () => {
    const setLastError = vi.fn();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const { result } = renderHook(() =>
      useAiPathsValidationActions({
        setAiPathsValidation: vi.fn(),
        setLastError,
        toast: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.persistLastError('something failed');
      await result.current.persistLastError(null);
    });

    expect(setLastError).toHaveBeenNthCalledWith(1, 'something failed');
    expect(setLastError).toHaveBeenNthCalledWith(2, null);
    expect(setItemSpy).toHaveBeenCalledWith('ai-paths:last-error', 'something failed');
    expect(removeItemSpy).toHaveBeenCalledWith('ai-paths:last-error');
    expect(mockState.logClientError).not.toHaveBeenCalled();
  });

  it('logs persistence failures when localStorage throws', async () => {
    const failure = new Error('quota exceeded');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw failure;
    });

    const { result } = renderHook(() =>
      useAiPathsValidationActions({
        setAiPathsValidation: vi.fn(),
        setLastError: vi.fn(),
        toast: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.persistLastError('persist me');
    });

    expect(setItemSpy).toHaveBeenCalledWith('ai-paths:last-error', 'persist me');
    expect(mockState.logClientError).toHaveBeenNthCalledWith(1, failure);
    expect(mockState.logClientError).toHaveBeenNthCalledWith(2, failure, {
      context: {
        service: 'ai-paths',
        action: 'persistLastError',
      },
    });
  });

  it('reports Error instances with fallback messaging, toast, persistence, and service context', () => {
    const toast = vi.fn();
    const sourceError = new Error('raw failure');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() =>
      useAiPathsValidationActions({
        setAiPathsValidation: vi.fn(),
        setLastError: vi.fn(),
        toast,
      })
    );

    act(() => {
      result.current.reportAiPathsError(sourceError, { action: 'save' }, 'Save failed');
    });

    expect(toast).toHaveBeenCalledWith('Save failed', { variant: 'error' });
    expect(setItemSpy).toHaveBeenCalledWith('ai-paths:last-error', 'Save failed');
    expect(mockState.logClientError).toHaveBeenCalledWith(sourceError, {
      context: {
        service: 'ai-paths',
        action: 'save',
      },
    });
  });

  it('wraps non-Error values and uses the raw string when no fallback is provided', () => {
    const toast = vi.fn();
    const setLastError = vi.fn();

    const { result } = renderHook(() =>
      useAiPathsValidationActions({
        setAiPathsValidation: vi.fn(),
        setLastError,
        toast,
      })
    );

    act(() => {
      result.current.reportAiPathsError('plain failure', { source: 'manual' });
    });

    expect(toast).toHaveBeenCalledWith('plain failure', { variant: 'error' });
    expect(setLastError).toHaveBeenCalledWith('plain failure');

    const [loggedError, loggedMeta] = mockState.logClientError.mock.calls[0] as [
      Error,
      Record<string, unknown>,
    ];
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe('[ai-paths] plain failure');
    expect(loggedMeta).toEqual({
      context: {
        service: 'ai-paths',
        source: 'manual',
      },
    });
  });
});
