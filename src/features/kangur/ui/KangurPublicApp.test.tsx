import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  kangurFeaturePageMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  kangurFeaturePageMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

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

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePage: (props: { slug?: string[]; basePath?: string; embedded?: boolean }) => {
    if (props.slug?.[0] === 'broken') {
      throw new Error('Kaboom');
    }
    kangurFeaturePageMock(props);
    return <div data-testid='kangur-feature-page' />;
  },
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

import { KangurPublicApp } from '@/features/kangur/ui/KangurPublicApp';

describe('KangurPublicApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    render(<KangurPublicApp slug={['tests']} basePath='/' />);

    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['tests'],
      basePath: '/',
      embedded: false,
    });
  });

  it('forwards the embedded flag to the Kangur feature page', () => {
    render(<KangurPublicApp slug={['tests']} basePath='/' embedded />);

    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['tests'],
      basePath: '/',
      embedded: true,
    });
  });

  it('renders the Kangur fallback shell for root-owned runtime errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<KangurPublicApp slug={['broken']} basePath='/' />);

    expect(await screen.findByTestId('kangur-error-shell')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to kangur/i })).toHaveAttribute('href', '/');
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
