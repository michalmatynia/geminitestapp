import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const {
  setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContextMock,
  withKangurClientError,
  withKangurClientErrorSync,
  usePathnameMock,
  useSearchParamsMock,
} = vi.hoisted(() => {
  const mocks = globalThis.__kangurClientErrorMocks();
  return {
    setKangurClientObservabilityContextMock: mocks.setKangurClientObservabilityContextMock,
    clearKangurClientObservabilityContextMock: mocks.clearKangurClientObservabilityContextMock,
    withKangurClientError: mocks.withKangurClientError,
    withKangurClientErrorSync: mocks.withKangurClientErrorSync,
    usePathnameMock: vi.fn<() => string | null>(),
    useSearchParamsMock: vi.fn<() => URLSearchParams>(),
  };
});

const kangurRoutingProviderMock = vi.fn();

const mockKangurRoutingState = {
  pageKey: null as string | null,
  requestedPath: '/kangur',
  basePath: '/kangur',
  embedded: false,
};

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  setKangurClientObservabilityContext: setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContext: clearKangurClientObservabilityContextMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  KangurRoutingProvider: ({
    children,
    ...props
  }: {
    pageKey?: string | null;
    requestedPath?: string;
    requestedHref?: string;
    basePath: string;
    embedded: boolean;
      children: ReactNode;
  }) => {
    kangurRoutingProviderMock(props);
    mockKangurRoutingState.pageKey = props.pageKey ?? null;
    mockKangurRoutingState.requestedPath = props.requestedPath ?? '';
    mockKangurRoutingState.basePath = props.basePath;
    mockKangurRoutingState.embedded = props.embedded;
    return <div data-testid='kangur-routing-provider'>{children}</div>;
  },
  useKangurRoutingState: () => ({ ...mockKangurRoutingState }),
}));

vi.mock('@/features/kangur/ui/KangurFeatureApp', () => ({
  KangurFeatureApp: () => <div data-testid='kangur-feature-app'>Kangur feature app</div>,
}));

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

describe('KangurFeatureRouteShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLatchedKangurTopBarHeightCssValue();
    window.history.replaceState({}, '', '/kangur');
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    usePathnameMock.mockReturnValue('/kangur');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('maps lesson routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');

    render(<KangurFeatureRouteShell />);

    expect(screen.getByTestId('kangur-route-shell')).toHaveClass(
      'kangur-shell-viewport-height',
      'kangur-premium-bg'
    );
    expect(screen.getByTestId('kangur-route-shell').style.getPropertyValue('--kangur-top-bar-height')).toBe('');
    expect(screen.getByTestId('kangur-route-shell').style.background).toBe('');
    expect(screen.getByTestId('kangur-route-shell').style.color).toBe('');
    expect(screen.getByTestId('kangur-route-shell')).not.toHaveClass('text-slate-800');
    expect(screen.getByTestId('kangur-routing-provider')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
  });

  it('maps learner profile routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/profile');

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'LearnerProfile',
      requestedPath: '/kangur/profile',
      requestedHref: '/kangur/profile',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'LearnerProfile',
      requestedPath: '/kangur/profile',
    });
  });

  it('maps the tests slug while normalizing trailing slashes', () => {
    usePathnameMock.mockReturnValue('/kangur/tests/');

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
      requestedHref: '/kangur/tests',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
    });
  });

  it('maps competition routes into Kangur routing', () => {
    usePathnameMock.mockReturnValue('/kangur/competition');

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Competition',
      requestedPath: '/kangur/competition',
      requestedHref: '/kangur/competition',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Competition',
      requestedPath: '/kangur/competition',
    });
  });

  it('maps localized public routes into canonical Kangur routing while preserving the localized href', () => {
    usePathnameMock.mockReturnValue('/en/lessons');

    render(<KangurFeatureRouteShell basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
      requestedHref: '/en/lessons',
      basePath: '/',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
    });
  });

  it('falls back to the real browser pathname when the router pathname is transiently unavailable', () => {
    window.history.replaceState({}, '', '/en/lessons?focus=division');
    usePathnameMock.mockReturnValue(null);
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<KangurFeatureRouteShell basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
      requestedHref: '/en/lessons?focus=division',
      basePath: '/',
      embedded: false,
    });
  });

  it('falls back to the main page for the base Kangur path', () => {
    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });

  it('uses the main page behind the compatibility login route so the shell can show the modal', () => {
    usePathnameMock.mockReturnValue('/kangur/login');

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur/login',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });

  it('clears the client observability context on unmount', () => {
    const { unmount } = render(<KangurFeatureRouteShell />);

    unmount();

    expect(clearKangurClientObservabilityContextMock).toHaveBeenCalledTimes(1);
  });
});
