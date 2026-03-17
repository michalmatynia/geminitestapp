/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/testing/accessibility/axe';

vi.mock('@/features/auth/', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/(frontend)/_components/FrontendPublicOwnerShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: vi.fn(async () => null),
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
    expect(main).toHaveAttribute('id', 'app-content');
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
    expect(main).toHaveAttribute('id', 'app-content');
    expect(main).toHaveAttribute('tabindex', '-1');

    await expectNoAxeViolations(container);
  });
});
