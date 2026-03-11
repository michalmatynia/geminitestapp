/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/testing/accessibility/axe';

vi.mock('@/features/auth/', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/(frontend)/FrontendPublicOwnerShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: vi.fn(async () => null),
  shouldApplyFrontPageAppSelection: () => false,
}));

import AuthPublicLayout from '@/app/auth/layout';
import FrontendLayout from '@/app/(frontend)/layout';

describe('app shell accessibility', () => {
  it('renders a focusable main landmark in the frontend shell', async () => {
    const layout = await FrontendLayout({
      children: <div>Frontend content</div>,
    });
    const { container } = render(layout);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'app-content');
    expect(main).toHaveAttribute('tabindex', '-1');

    await expectNoAxeViolations(container);
  });

  it('renders a focusable main landmark in the auth shell', () => {
    const { container } = render(
      <AuthPublicLayout>
        <div>Auth content</div>
      </AuthPublicLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'app-content');
    expect(main).toHaveAttribute('tabindex', '-1');

    return expectNoAxeViolations(container);
  });
});
