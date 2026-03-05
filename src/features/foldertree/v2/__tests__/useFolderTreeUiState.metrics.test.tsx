import { render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeRuntime } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import { MasterFolderTreeRuntimeProvider } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import { useFolderTreeUiState } from '@/features/foldertree/v2/shell/useFolderTreeUiState';

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

const RuntimeWrapper = ({ children }: { children: ReactNode }) => (
  <MasterFolderTreeRuntimeProvider>{children}</MasterFolderTreeRuntimeProvider>
);

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
    mutateAsyncMock.mockImplementation(async () => undefined);
    logClientErrorMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not record parse metric for valid/default ui state payloads', () => {
    const { result } = renderHook(
      () => {
        const uiState = useFolderTreeUiState('notes');
        const runtime = useMasterFolderTreeRuntime();
        return { uiState, runtime };
      },
      { wrapper: RuntimeWrapper }
    );

    expect(result.current.uiState.panel.collapsed).toBe(false);
    expect(result.current.runtime.getMetricsSnapshot()['ui_state_parse_failure'] ?? 0).toBe(0);
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('records parse metric and logs client error when persisted ui state is invalid', async () => {
    settingsStoreMock.get.mockReturnValue('{"panelCollapsed":"yes"}');

    let runtimeRef: ReturnType<typeof useMasterFolderTreeRuntime> | null = null;
    let boundaryError: Error | null = null;

    const RuntimeProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      useEffect(() => {
        runtimeRef = runtime;
      }, [runtime]);
      return null;
    };

    const InvalidUiProbe = () => {
      useFolderTreeUiState('notes');
      return null;
    };

    render(
      <RuntimeWrapper>
        <RuntimeProbe />
        <ErrorBoundary
          onError={(error) => {
            boundaryError = error;
          }}
        >
          <InvalidUiProbe />
        </ErrorBoundary>
      </RuntimeWrapper>
    );

    await waitFor(() => {
      expect(boundaryError).toBeTruthy();
      expect(runtimeRef?.getMetricsSnapshot()['ui_state_parse_failure'] ?? 0).toBeGreaterThanOrEqual(
        1
      );
      expect(logClientErrorMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
