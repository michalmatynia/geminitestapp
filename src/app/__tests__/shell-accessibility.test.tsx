/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/testing/accessibility/axe';

vi.mock('@/features/auth/public', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/public', () => ({
  FrontendPublicOwnerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FrontendPublicOwnerShellClient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KangurSSRSkeleton: () => <div data-testid='kangur-ssr-skeleton' />,
  KangurServerShell: () => <div data-testid='kangur-server-shell' />,
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: vi.fn(async () => ({
    enabled: false,
    setting: null,
    publicOwner: 'cms',
    redirectPath: null,
    source: 'disabled',
    fallbackReason: null,
  })),
  shouldApplyFrontPageAppSelection: () => false,
}));

describe('app shell accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders a focusable main landmark in the frontend shell', async () => {
    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');
    const layout = await FrontendLayout({
      children: <div>Frontend content</div>,
    });
    const { container } = render(layout);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'kangur-main-content');
    expect(main).toHaveAttribute('tabindex', '-1');

    await expectNoAxeViolations(container);
  });

  it('renders a focusable main landmark in the auth shell', async () => {
    const { default: AuthPublicLayout } = await import('@/app/auth/layout');
    const { container } = render(
      <AuthPublicLayout>
        <div>Auth content</div>
      </AuthPublicLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'kangur-main-content');
    expect(main).toHaveAttribute('tabindex', '-1');

    await expectNoAxeViolations(container);
  });
});
