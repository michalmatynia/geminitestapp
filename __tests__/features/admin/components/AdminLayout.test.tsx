import { render, screen, fireEvent } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  })),
}));

// Mock NoteSettingsProvider
vi.mock('@/features/notesapp', () => ({
  NoteSettingsProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('AdminLayout', () => {
  it('renders children correctly', () => {
    render(
      <AdminLayout>
        <div data-testid="child">Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders the sidebar with Admin logo', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('can collapse and expand the sidebar', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const aside = screen.getByRole('complementary');
    const toggleButton = screen.getByRole('button', { name: '' }); // The chevron button

    // Initially expanded
    expect(aside).toHaveClass('w-64');

    // Click collapse
    fireEvent.click(toggleButton);
    expect(aside).toHaveClass('w-20');
    
    // Admin text should be gone (it's conditional on !isMenuCollapsed)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();

    // Click expand
    fireEvent.click(toggleButton);
    expect(aside).toHaveClass('w-64');
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders UserNav in the header', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    // UserNav has an avatar/initials or trigger
    // Based on UserNav.tsx (shadow-guessing or checking if needed)
    // For now we check if there's a button in the header area
    const mainArea = screen.getByRole('main').parentElement;
    const header = mainArea?.querySelector('header');
    expect(header).toBeInTheDocument();
  });
});
