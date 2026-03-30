// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const settingsStoreRef = {
  current: new Map<string, string | undefined>(),
};

const useSystemSyncMock = vi.fn(() => ({
  isOnline: true,
  lastSync: null,
  forceSync: vi.fn(),
}));

vi.mock('@/shared/hooks/sync/useSystemSync', () => ({
  useSystemSync: (...args: unknown[]) => useSystemSyncMock(...args),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    map: settingsStoreRef.current,
  }),
}));

vi.mock('@/shared/ui/QueryDevPanel', () => ({
  QueryDevPanel: ({
    enabled,
    open,
  }: {
    enabled?: boolean;
    open?: boolean;
  }) => (
    <div
      data-testid='query-dev-panel'
      data-enabled={String(Boolean(enabled))}
      data-open={String(Boolean(open))}
    />
  ),
}));

import { BackgroundSyncProvider } from './BackgroundSyncProvider';

describe('BackgroundSyncProvider', () => {
  beforeEach(() => {
    settingsStoreRef.current = new Map();
    useSystemSyncMock.mockClear();
  });

  it('renders children without mounting the query dev panel when it is disabled', () => {
    render(
      <BackgroundSyncProvider>
        <div data-testid='background-sync-child'>child</div>
      </BackgroundSyncProvider>
    );

    expect(screen.getByTestId('background-sync-child')).toBeInTheDocument();
    expect(screen.queryByTestId('query-dev-panel')).not.toBeInTheDocument();
  });

  it('loads the query dev panel after mount when it is enabled in settings', async () => {
    settingsStoreRef.current = new Map([
      ['query_status_panel_enabled', 'true'],
      ['query_status_panel_open', 'true'],
    ]);

    render(
      <BackgroundSyncProvider>
        <div data-testid='background-sync-child'>child</div>
      </BackgroundSyncProvider>
    );

    expect(screen.getByTestId('background-sync-child')).toBeInTheDocument();
    expect(screen.queryByTestId('query-dev-panel')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('query-dev-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('query-dev-panel')).toHaveAttribute('data-enabled', 'true');
    expect(screen.getByTestId('query-dev-panel')).toHaveAttribute('data-open', 'true');
  });
});
