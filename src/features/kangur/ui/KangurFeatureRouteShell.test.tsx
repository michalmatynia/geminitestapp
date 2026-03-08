import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  usePathnameMock,
  setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContextMock,
  kangurRoutingProviderMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  setKangurClientObservabilityContextMock: vi.fn(),
  clearKangurClientObservabilityContextMock: vi.fn(),
  kangurRoutingProviderMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  setKangurClientObservabilityContext: setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContext: clearKangurClientObservabilityContextMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  KangurRoutingProvider: ({
    children,
    ...props
  }: {
    pageKey?: string | null;
    requestedPath?: string;
    basePath: string;
    embedded: boolean;
    children: ReactNode;
  }) => {
    kangurRoutingProviderMock(props);
    return <div data-testid='kangur-routing-provider'>{children}</div>;
  },
}));

vi.mock('@/features/kangur/ui/KangurFeatureApp', () => ({
  KangurFeatureApp: () => <div data-testid='kangur-feature-app'>Kangur feature app</div>,
}));

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

describe('KangurFeatureRouteShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/kangur');
  });

  it('maps lesson routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');

    render(<KangurFeatureRouteShell />);

    expect(screen.getByTestId('kangur-route-shell')).toHaveClass(
      'min-h-screen',
      'kangur-premium-bg'
    );
    expect(screen.getByTestId('kangur-feature-app')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
  });

  it('normalizes trailing slashes for the public tests route', () => {
    usePathnameMock.mockReturnValue('/kangur/tests/');

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
    });
  });

  it('falls back to the main page for the base Kangur path', () => {
    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
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
