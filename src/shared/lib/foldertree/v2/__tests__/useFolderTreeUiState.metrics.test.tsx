import { render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMasterFolderTreeRuntimeBus } from '@/shared/lib/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
import { useFolderTreeUiState } from '@/shared/lib/foldertree/v2/shell/useFolderTreeUiState';

const {
  settingsStoreMock,
  mutateAsyncMock,
  logClientErrorMock,
}: {
  settingsStoreMock: {
    get: ReturnType<typeof vi.fn>;
    isLoading: boolean;
    isFetching: boolean;
  };
  mutateAsyncMock: ReturnType<typeof vi.fn>;
  logClientErrorMock: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn(() => undefined),
    isLoading: false,
    isFetching: false,
  },
  mutateAsyncMock: vi.fn(async () => undefined),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

const runtimes: Array<ReturnType<typeof createMasterFolderTreeRuntimeBus>> = [];
const createTestRuntime = () => {
  const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
  runtimes.push(runtime);
  return runtime;
};

class ErrorBoundary extends React.Component<
  {
    children: ReactNode;
    onError: (error: Error) => void;
  },
  { hasError: boolean }
> {
  public override state = { hasError: false };

  public override componentDidCatch(error: Error): void {
    this.props.onError(error);
    this.setState({ hasError: true });
  }

  public override render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

describe('useFolderTreeUiState metrics', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    settingsStoreMock.get.mockReset();
    settingsStoreMock.get.mockReturnValue(undefined);
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue(undefined);
    logClientErrorMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    while (runtimes.length > 0) {
      runtimes.pop()?.dispose();
    }
  });

  it('does not record parse metric for valid/default ui state payloads', () => {
    const runtime = createTestRuntime();
    const { result } = renderHook(() =>
      useFolderTreeUiState('notes', undefined, undefined, runtime)
    );

    expect(result.current.panel.collapsed).toBe(false);
    expect(runtime.getMetricsSnapshot()['ui_state_parse_failure'] ?? 0).toBe(0);
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('records parse metric and logs client error when persisted ui state is invalid', async () => {
    settingsStoreMock.get.mockReturnValue('{"panelCollapsed":"yes"}');
    const runtime = createTestRuntime();

    let boundaryError: Error | null = null;

    const InvalidUiProbe = () => {
      useFolderTreeUiState('notes', undefined, undefined, runtime);
      return null;
    };

    render(
      <ErrorBoundary
        onError={(error) => {
          boundaryError = error;
        }}
      >
        <InvalidUiProbe />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(boundaryError).toBeTruthy();
      expect(runtime.getMetricsSnapshot()['ui_state_parse_failure'] ?? 0).toBeGreaterThanOrEqual(1);
      expect(logClientErrorMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
