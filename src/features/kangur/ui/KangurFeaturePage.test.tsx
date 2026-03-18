import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildKangurEmbeddedBasePath } from '@/features/kangur/config/routing';

const {
  setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContextMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => {
  const mocks = globalThis.__kangurClientErrorMocks();
  return {
    setKangurClientObservabilityContextMock: mocks.setKangurClientObservabilityContextMock,
    clearKangurClientObservabilityContextMock: mocks.clearKangurClientObservabilityContextMock,
    withKangurClientError: mocks.withKangurClientError,
    withKangurClientErrorSync: mocks.withKangurClientErrorSync,
  };
});

const kangurRoutingProviderMock = vi.fn();

const mockKangurRoutingState = {
  pageKey: null as string | null,
  requestedPath: '/',
  basePath: '/kangur',
  embedded: false,
};

const { kangurAppearanceMock } = vi.hoisted(() => ({
  kangurAppearanceMock: {
    background: '#ffffff',
    tone: {
      text: '#111827',
      border: '#e2e8f0',
      accent: '#6366f1',
      background: '#ffffff',
    },
    vars: {},
    theme: {
      customCss: '.kangur-custom { color: red; }',
      customCssSelectors: '.kangur-custom',
    },
  },
}));

const originalCustomCssEnv = process.env['NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED'];
const setEnvValue = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

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

vi.mock('@/features/kangur/ui/useKangurStorefrontAppearance', () => ({
  useKangurStorefrontAppearance: () => kangurAppearanceMock as any,
}));

import { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';

describe('KangurFeaturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvValue('NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED', originalCustomCssEnv);
    delete document.body.dataset.kangurShell;
    document.body.style.overflow = '';
  });

  afterEach(() => {
    setEnvValue('NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED', originalCustomCssEnv);
    delete document.body.dataset.kangurShell;
    document.body.style.overflow = '';
  });

  it('does not lock body scroll when rendering an embedded page mount', () => {
    render(
      <KangurFeaturePage
        slug={['lessons']}
        basePath={buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a')}
        embedded
      />
    );

    expect(document.body.dataset.kangurShell).toBeUndefined();
    expect(document.body.style.overflow).toBe('');
  });

  it('locks body scroll when forceBodyScrollLock is enabled for embedded mounts', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a');
    const { unmount } = render(
      <KangurFeaturePage
        slug={['lessons']}
        basePath={embeddedBasePath}
        embedded
        forceBodyScrollLock
      />
    );

    expect(document.body.dataset.kangurShell).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.dataset.kangurShell).toBeUndefined();
    expect(document.body.style.overflow).toBe('');
  });

  it('renders the persistent shell for embedded Kangur mounts', () => {
    render(
      <KangurFeaturePage
        slug={['lessons']}
        basePath={buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a')}
        embedded
      />
    );

    expect(screen.getByTestId('kangur-feature-page-shell')).toHaveClass(
      'kangur-premium-bg',
      'min-h-full'
    );
    expect(screen.getByTestId('kangur-feature-app')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/home?preview=1&kangur-app-embed-a=lessons',
      requestedHref: '/home?preview=1&kangur-app-embed-a=lessons',
      basePath: '__kangur_embed__:app-embed-a::/home?preview=1',
      embedded: true,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/home?preview=1&kangur-app-embed-a=lessons',
    });
  });

  it('uses the full-screen shell for direct Kangur page mounts', () => {
    render(<KangurFeaturePage slug={['tests']} basePath='/kangur' />);

    expect(screen.getByTestId('kangur-feature-page-shell')).toHaveClass(
      'kangur-premium-bg',
      'min-h-[100dvh]'
    );
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
      requestedHref: '/kangur/tests',
      basePath: '/kangur',
      embedded: false,
    });
  });

  it('supports direct root-mounted Kangur page mounts', () => {
    render(<KangurFeaturePage slug={['tests']} basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/tests',
      requestedHref: '/tests',
      basePath: '/',
      embedded: false,
    });
  });

  it('supports direct competition route mounts', () => {
    render(<KangurFeaturePage slug={['competition']} basePath='/kangur' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Competition',
      requestedPath: '/kangur/competition',
      requestedHref: '/kangur/competition',
      basePath: '/kangur',
      embedded: false,
    });
  });

  it('keeps the embedded shell node mounted when the requested embedded page changes', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a');
    const { rerender } = render(
      <KangurFeaturePage slug={['lessons']} basePath={embeddedBasePath} embedded />
    );

    const shell = screen.getByTestId('kangur-feature-page-shell');
    shell.setAttribute('data-e2e-shell-marker', 'persist');

    rerender(<KangurFeaturePage slug={['tests']} basePath={embeddedBasePath} embedded />);

    expect(screen.getByTestId('kangur-feature-page-shell')).toHaveAttribute(
      'data-e2e-shell-marker',
      'persist'
    );
    expect(kangurRoutingProviderMock).toHaveBeenLastCalledWith({
      pageKey: 'Tests',
      requestedPath: '/home?preview=1&kangur-app-embed-a=tests',
      requestedHref: '/home?preview=1&kangur-app-embed-a=tests',
      basePath: '__kangur_embed__:app-embed-a::/home?preview=1',
      embedded: true,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenLastCalledWith({
      pageKey: 'Tests',
      requestedPath: '/home?preview=1&kangur-app-embed-a=tests',
    });
  });

  it('clears the observability context on unmount', () => {
    const { unmount } = render(<KangurFeaturePage slug={['game']} basePath='/kangur' />);

    unmount();

    expect(clearKangurClientObservabilityContextMock).toHaveBeenCalledTimes(1);
  });

  it('renders the scoped custom CSS when enabled', () => {
    setEnvValue('NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED', 'true');

    render(<KangurFeaturePage slug={['tests']} basePath='/kangur' />);

    const styleTag = document.querySelector('style[data-kangur-custom-css]');
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('.kangur-custom');
  });

  it('skips custom CSS when disabled via env', () => {
    setEnvValue('NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED', 'false');

    render(<KangurFeaturePage slug={['tests']} basePath='/kangur' />);

    expect(document.querySelector('style[data-kangur-custom-css]')).toBeNull();
  });
});
