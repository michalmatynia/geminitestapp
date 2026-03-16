import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  usePathnameMock,
  useSearchParamsMock,
  setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContextMock,
  kangurRoutingProviderMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  useSearchParamsMock: vi.fn<() => URLSearchParams>(),
  setKangurClientObservabilityContextMock: vi.fn(),
  clearKangurClientObservabilityContextMock: vi.fn(),
  kangurRoutingProviderMock: vi.fn(),
}));

const mockKangurRoutingState = {
  pageKey: null as string | null,
  requestedPath: '/kangur',
  basePath: '/kangur',
  embedded: false,
};

const withKangurClientError = async <T,>(
  _report: unknown,
  task: () => Promise<T>,
  options: {
    fallback: T | (() => T);
    onError?: (error: unknown) => void;
    shouldReport?: (error: unknown) => boolean;
    shouldRethrow?: (error: unknown) => boolean;
  }
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

const withKangurClientErrorSync = <T,>(
  _report: unknown,
  task: () => T,
  options: {
    fallback: T | (() => T);
    onError?: (error: unknown) => void;
    shouldReport?: (error: unknown) => boolean;
    shouldRethrow?: (error: unknown) => boolean;
  }
): T => {
  try {
    return task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
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
    usePathnameMock.mockReturnValue('/kangur');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('maps lesson routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');

    render(<KangurFeatureRouteShell />);

    expect(screen.getByTestId('kangur-route-shell')).toHaveClass(
      'min-h-[100dvh]',
      'kangur-premium-bg'
    );
    expect(screen.getByTestId('kangur-feature-app')).toBeInTheDocument();
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
