/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AuthPublicLayout from '@/app/auth/layout';
import FrontendLayout from '@/app/(frontend)/layout';

describe('app shell accessibility', () => {
  it('renders a focusable main landmark in the frontend shell', () => {
    render(
      <FrontendLayout>
        <div>Frontend content</div>
      </FrontendLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'app-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('renders a focusable main landmark in the auth shell', () => {
    render(
      <AuthPublicLayout>
        <div>Auth content</div>
      </AuthPublicLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'app-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});
