/**
 * @vitest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  appErrorBoundaryMock,
  appFontProviderMock,
  backgroundSyncProviderMock,
  cancelIdleCallbackMock,
  clientErrorReporterMock,
  csrfProviderMock,
  idleCallbacksRef,
  pageAnalyticsTrackerMock,
  queryProviderMock,
  routeAccessibilityAnnouncerMock,
  searchParamsRef,
  sessionProviderMock,
  settingsStoreProviderMock,
  themeProviderMock,
  toastProviderMock,
  urlGuardProviderMock,
  usePathnameMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  appErrorBoundaryMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  appFontProviderMock: vi.fn(() => <div data-testid='app-font-provider' />),
  backgroundSyncProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='background-sync-provider'>{children}</div>
  )),
  cancelIdleCallbackMock: vi.fn(),
  clientErrorReporterMock: vi.fn(() => <div data-testid='client-error-reporter' />),
  csrfProviderMock: vi.fn(() => <div data-testid='csrf-provider' />),
  idleCallbacksRef: [] as IdleRequestCallback[],
  pageAnalyticsTrackerMock: vi.fn(() => <div data-testid='page-analytics-tracker' />),
  queryProviderMock: vi.fn(
    ({ children, mode }: { children: ReactNode; mode: 'full' | 'light' }) => (
      <div data-testid='query-provider' data-mode={mode}>
        {children}
      </div>
    )
  ),
  routeAccessibilityAnnouncerMock: vi.fn(() => <div data-testid='route-accessibility-announcer' />),
  searchParamsRef: { current: new URLSearchParams() },
  sessionProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='session-provider'>{children}</div>
  )),
  settingsStoreProviderMock: vi.fn(
    ({
      children,
      mode,
      suppressOwnQuery,
    }: {
      children: ReactNode;
      mode: 'admin' | 'lite';
      suppressOwnQuery?: boolean;
    }) => (
      <div
        data-testid='settings-store-provider'
        data-mode={mode}
        data-suppress-own-query={String(Boolean(suppressOwnQuery))}
      >
        {children}
      </div>
    )
  ),
  themeProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='theme-provider'>{children}</div>
  )),
  toastProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='toast-provider'>{children}</div>
  )),
  urlGuardProviderMock: vi.fn(() => <div data-testid='url-guard-provider' />),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({
    children,
    refetchOnWindowFocus,
    session,
  }: {
    children: ReactNode;
    refetchOnWindowFocus?: boolean;
    session?: unknown;
  }) =>
    sessionProviderMock({
      children,
      refetchOnWindowFocus,
      session,
    }),
}));

vi.mock('@/shared/providers/AppFontProvider', () => ({
  AppFontProvider: () => appFontProviderMock(),
}));

vi.mock('@/shared/providers/BackgroundSyncProvider', () => ({
  BackgroundSyncProvider: ({ children }: { children: ReactNode }) =>
    backgroundSyncProviderMock({ children }),
}));

vi.mock('@/shared/providers/QueryProvider', () => ({
  QueryProvider: ({
    children,
    mode,
  }: {
    children: ReactNode;
    mode: 'full' | 'light';
  }) => queryProviderMock({ children, mode }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({
    children,
    mode,
    suppressOwnQuery,
  }: {
    children: ReactNode;
    mode: 'admin' | 'lite';
    suppressOwnQuery?: boolean;
  }) => settingsStoreProviderMock({ children, mode, suppressOwnQuery }),
}));

vi.mock('@/shared/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => themeProviderMock({ children }),
}));

vi.mock('@/shared/ui/AppErrorBoundary', () => ({
  AppErrorBoundary: ({ children }: { children: ReactNode }) => appErrorBoundaryMock({ children }),
}));

vi.mock('@/shared/ui/RouteAccessibilityAnnouncer', () => ({
  RouteAccessibilityAnnouncer: () => routeAccessibilityAnnouncerMock(),
}));

vi.mock('@/shared/ui/toast', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => toastProviderMock({ children }),
}));

vi.mock('@/shared/providers/CsrfProvider', () => ({
  default: () => csrfProviderMock(),
}));

vi.mock('@/shared/providers/UrlGuardProvider', () => ({
  UrlGuardProvider: () => urlGuardProviderMock(),
}));

vi.mock('@/shared/lib/observability/components/ClientErrorReporter', () => ({
  default: () => clientErrorReporterMock(),
}));

vi.mock('@/shared/lib/analytics/components/PageAnalyticsTracker', () => ({
  default: () => pageAnalyticsTrackerMock(),
}));

describe('RootProvidersClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    idleCallbacksRef.length = 0;
    searchParamsRef.current = new URLSearchParams();
    usePathnameMock.mockReturnValue('/en');
    useSearchParamsMock.mockImplementation(() => searchParamsRef.current);

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn((callback: IdleRequestCallback) => {
        idleCallbacksRef.push(callback);
        return idleCallbacksRef.length;
      }),
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: cancelIdleCallbackMock,
    });
  });

  it('keeps the public shell lean until deferred services are activated', async () => {
    const { RootProvidersClient } = await import('./RootProvidersClient');

    render(
      <RootProvidersClient>
        <div data-testid='route-child'>public page</div>
      </RootProvidersClient>
    );

    expect(screen.getByTestId('route-child')).toBeInTheDocument();
    expect(screen.getByTestId('query-provider')).toHaveAttribute('data-mode', 'light');
    expect(screen.queryByTestId('background-sync-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('client-error-reporter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-analytics-tracker')).not.toBeInTheDocument();
    expect(screen.queryByTestId('url-guard-provider')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('csrf-provider')).toBeInTheDocument();
    });

    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);

    await act(async () => {
      const callback = idleCallbacksRef.shift();
      callback?.({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });

    await waitFor(() => {
      expect(screen.getByTestId('client-error-reporter')).toBeInTheDocument();
    });
    expect(screen.getByTestId('page-analytics-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('url-guard-provider')).toBeInTheDocument();
  });

  it('renders the full runtime immediately on admin routes', async () => {
    usePathnameMock.mockReturnValue('/en/admin/settings');

    const { RootProvidersClient } = await import('./RootProvidersClient');

    render(
      <RootProvidersClient>
        <div data-testid='route-child'>admin page</div>
      </RootProvidersClient>
    );

    expect(screen.getByTestId('query-provider')).toHaveAttribute('data-mode', 'full');
    expect(screen.getByTestId('background-sync-provider')).toBeInTheDocument();
    expect(window.requestIdleCallback).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId('client-error-reporter')).toBeInTheDocument();
    });
    expect(screen.getByTestId('page-analytics-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('url-guard-provider')).toBeInTheDocument();
    expect(screen.getByTestId('csrf-provider')).toBeInTheDocument();
  });
});
