// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchParamsRef = { current: new URLSearchParams() };
const sessionProviderPropsMock = vi.fn();
const settingsStoreProviderPropsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    refetchOnWindowFocus?: boolean;
    session?: unknown;
  }) => {
    sessionProviderPropsMock(props);
    return <>{children}</>;
  },
}));

vi.mock('@/features/observability/components/ClientErrorReporter', () => ({
  default: () => <div data-testid='client-error-reporter' />,
}));

vi.mock('@/shared/lib/analytics/components/PageAnalyticsTracker', () => ({
  default: () => <div data-testid='page-analytics-tracker' />,
}));

vi.mock('@/shared/providers/AppFontProvider', () => ({
  AppFontProvider: () => null,
}));

vi.mock('@/shared/providers/BackgroundSyncProvider', () => ({
  BackgroundSyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/providers/CsrfProvider', () => ({
  CsrfProvider: () => null,
}));

vi.mock('@/shared/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    mode?: 'admin' | 'lite';
    suppressOwnQuery?: boolean;
  }) => {
    settingsStoreProviderPropsMock(props);
    return <>{children}</>;
  },
}));

vi.mock('@/shared/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/providers/UrlGuardProvider', () => ({
  UrlGuardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/ui/AppErrorBoundary', () => ({
  AppErrorBoundary: ({
    children,
  }: {
    children: React.ReactNode;
    source: string;
  }) => <>{children}</>,
}));

vi.mock('@/shared/ui/RouteAccessibilityAnnouncer', () => ({
  RouteAccessibilityAnnouncer: () => null,
}));

vi.mock('@/shared/ui/SkipToContentLink', () => ({
  SkipToContentLink: () => null,
}));

vi.mock('@/shared/ui/toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { RootProvidersClient } from './RootProvidersClient';

describe('RootProvidersClient', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams();
    sessionProviderPropsMock.mockClear();
    settingsStoreProviderPropsMock.mockClear();
  });

  it('keeps normal settings and session bootstrapping outside synthetic Kangur captures', () => {
    render(
      <RootProvidersClient>
        <div data-testid='content'>content</div>
      </RootProvidersClient>
    );

    expect(settingsStoreProviderPropsMock).toHaveBeenCalledWith({
      mode: 'lite',
      suppressOwnQuery: false,
    });
    expect(sessionProviderPropsMock).toHaveBeenCalledWith({
      refetchOnWindowFocus: false,
      session: undefined,
    });
    expect(screen.getByTestId('client-error-reporter')).toBeInTheDocument();
    expect(screen.getByTestId('page-analytics-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('suppresses settings and session bootstrap during synthetic Kangur social captures', () => {
    searchParamsRef.current = new URLSearchParams('kangurCapture=social-batch');

    render(
      <RootProvidersClient>
        <div data-testid='content'>content</div>
      </RootProvidersClient>
    );

    expect(settingsStoreProviderPropsMock).toHaveBeenCalledWith({
      mode: 'lite',
      suppressOwnQuery: true,
    });
    expect(sessionProviderPropsMock).toHaveBeenCalledWith({
      refetchOnWindowFocus: false,
      session: null,
    });
    expect(screen.queryByTestId('client-error-reporter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-analytics-tracker')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
