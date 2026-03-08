import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  kangurFeaturePageMock,
  kangurLoginPageMock,
} = vi.hoisted(() => ({
  kangurFeaturePageMock: vi.fn(),
  kangurLoginPageMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePage: (props: { slug?: string[]; basePath?: string }) => {
    kangurFeaturePageMock(props);
    return <div data-testid='kangur-feature-page' />;
  },
}));

vi.mock('@/features/kangur/ui/KangurLoginPage', () => ({
  KangurLoginPage: (props: { defaultCallbackUrl: string; backHref: string }) => {
    kangurLoginPageMock(props);
    return <div data-testid='kangur-login-page' />;
  },
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-sync'>{children}</div>
  ),
}));

import { KangurPublicApp } from '@/features/kangur/ui/KangurPublicApp';

describe('KangurPublicApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the public Kangur login page at /login when mounted at root', () => {
    render(<KangurPublicApp slug={['login']} basePath='/' />);

    expect(screen.getByTestId('kangur-surface-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-page')).toBeInTheDocument();
    expect(kangurLoginPageMock).toHaveBeenCalledWith({
      defaultCallbackUrl: '/',
      backHref: '/',
    });
  });

  it('renders the Kangur feature page for public app routes', () => {
    render(<KangurPublicApp slug={['tests']} basePath='/' />);

    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurFeaturePageMock).toHaveBeenCalledWith({
      slug: ['tests'],
      basePath: '/',
    });
  });
});
