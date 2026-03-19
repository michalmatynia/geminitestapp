import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logClientErrorMock = vi.fn();

vi.mock('@/shared/lib/ai-paths/core/definitions/docs-snippets', () => ({
  DOCS_WIRING_SNIPPET: 'wiring snippet',
  DOCS_DESCRIPTION_SNIPPET: 'description snippet',
  DOCS_JOBS_SNIPPET: 'jobs snippet',
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import { useAiPathsSettingsDocsActions } from '../useAiPathsSettingsDocsActions';

describe('useAiPathsSettingsDocsActions', () => {
  beforeEach(() => {
    logClientErrorMock.mockReset();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies the wiring docs snippet and shows a success toast', async () => {
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsWiring();
    });

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('wiring snippet');
    expect(toast).toHaveBeenCalledWith('Wiring copied to clipboard.', { variant: 'success' });
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('reports wiring clipboard failures', async () => {
    const failure = new Error('clipboard unavailable');
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(failure),
      },
    });
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsWiring();
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'copyDocsWiring' },
      'Failed to copy wiring:'
    );
    expect(toast).toHaveBeenCalledWith('Failed to copy wiring.', { variant: 'error' });
  });

  it('copies the AI Description docs snippet and shows a success toast', async () => {
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsDescription();
    });

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('description snippet');
    expect(toast).toHaveBeenCalledWith('AI Description wiring copied.', {
      variant: 'success',
    });
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('reports AI Description clipboard failures', async () => {
    const failure = new Error('description copy failed');
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(failure),
      },
    });
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsDescription();
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'copyDocsDescription' },
      'Failed to copy AI Description wiring:'
    );
    expect(toast).toHaveBeenCalledWith('Failed to copy AI Description wiring.', {
      variant: 'error',
    });
  });

  it('copies the jobs docs snippet and shows a success toast', async () => {
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsJobs();
    });

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('jobs snippet');
    expect(toast).toHaveBeenCalledWith('Jobs wiring copied.', { variant: 'success' });
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('reports jobs clipboard failures', async () => {
    const failure = new Error('jobs copy failed');
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(failure),
      },
    });
    const toast = vi.fn();
    const reportAiPathsError = vi.fn();
    const { result } = renderHook(() =>
      useAiPathsSettingsDocsActions({ toast, reportAiPathsError })
    );

    await act(async () => {
      await result.current.handleCopyDocsJobs();
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'copyDocsJobs' },
      'Failed to copy jobs wiring:'
    );
    expect(toast).toHaveBeenCalledWith('Failed to copy jobs wiring.', { variant: 'error' });
  });
});
