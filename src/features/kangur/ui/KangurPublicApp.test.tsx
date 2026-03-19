import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logKangurClientErrorMock, withKangurClientError, withKangurClientErrorSync } =
  vi.hoisted(() => {
    const mocks = globalThis.__kangurClientErrorMocks();
    return {
      logKangurClientErrorMock: mocks.logKangurClientErrorMock,
      withKangurClientError: mocks.withKangurClientError,
      withKangurClientErrorSync: mocks.withKangurClientErrorSync,
    };
  });

const kangurFeaturePageMock = vi.fn();
const kangurFeaturePageState = {
  slug: [] as string[],
  basePath: '/',
  embedded: false,
};

function KangurFeaturePageMock(props: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
}): React.ReactElement {
  if (props.slug?.[0] === 'broken') {
    throw new Error('Kaboom');
  }
  kangurFeaturePageMock(props);
  return <div data-testid='kangur-feature-page' />;
}

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/config/routing', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/config/routing')>(
    '@/features/kangur/config/routing'
  );

  return {
    ...actual,
    resolveKangurFeaturePageRoute: (slug: string[] = [], basePath = '/') => {
      kangurFeaturePageState.slug = slug;
      kangurFeaturePageState.basePath = basePath;
      kangurFeaturePageState.embedded = false;
      return actual.resolveKangurFeaturePageRoute(slug, basePath);
    },
  };
});

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePage: KangurFeaturePageMock,
  KangurFeaturePageShell: () => <KangurFeaturePageMock {...kangurFeaturePageState} />,
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { KangurPublicApp } from '@/features/kangur/ui/KangurPublicApp';

describe('KangurPublicApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kangurFeaturePageState.slug = [];
    kangurFeaturePageState.basePath = '/';
    kangurFeaturePageState.embedded = false;
  });

  it('renders the Kangur feature shell for the public login slug so the modal can open in place', () => {
    render(<KangurPublicApp slug={['login']} basePath='/' />);

    expect(screen.getByTestId('kangur-surface-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['login'],
      basePath: '/',
      embedded: false,
    });
  });

  it('renders the Kangur feature page for public app routes', () => {
    render(<KangurPublicApp slug={['lessons']} basePath='/' />);

    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['lessons'],
      basePath: '/',
      embedded: false,
    });
  });

  it('forwards the embedded flag to the Kangur feature page', () => {
    render(<KangurPublicApp slug={['lessons']} basePath='/' embedded />);

    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['lessons'],
      basePath: '/',
      embedded: false,
    });
  });

  it('renders the Kangur fallback shell for root-owned runtime errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<KangurPublicApp slug={['broken']} basePath='/' />);

    expect(await screen.findByTestId('kangur-error-shell')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /backToHome/i })).toHaveAttribute('href', '/');
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Kaboom' }),
      expect.objectContaining({
        source: 'kangur-public-error-boundary',
        action: 'render',
        homeHref: '/',
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
