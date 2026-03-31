import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { server } from '@/mocks/server';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ToastProvider } from '@/shared/ui/toast';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => '/admin'),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
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
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock NoteSettingsProvider
vi.mock('@/features/notesapp', () => ({
  NoteSettingsProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderLayout = (children: ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsStoreProvider>
        <ToastProvider>
          <AdminLayout>{children}</AdminLayout>
        </ToastProvider>
      </SettingsStoreProvider>
    </QueryClientProvider>
  );
};

describe('AdminLayout', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/admin');
    server.use(
      http.get('/api/user/preferences', () => HttpResponse.json({})),
      http.patch('/api/user/preferences', () => HttpResponse.json({})),
      http.get('/api/settings/lite', () => HttpResponse.json([])),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true }))
    );
  });

  it('renders children correctly', () => {
    renderLayout(<div data-testid='child'>Test Content</div>);

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByRole('main').className).toContain('p-4');
  });

  it('removes outer main padding for embedded kangur routes', () => {
    usePathnameMock.mockReturnValue('/admin/kangur/lessons');

    renderLayout(<div>Content</div>);

    expect(screen.getByRole('main').className).not.toContain('p-4');
  });

  it('keeps default main padding for kangur lessons manager', () => {
    usePathnameMock.mockReturnValue('/admin/kangur/lessons-manager');

    renderLayout(<div>Content</div>);

    expect(screen.getByRole('main').className).toContain('p-4');
  });

  it('can collapse and expand the sidebar', () => {
    renderLayout(<div>Content</div>);

    const aside = screen.getByRole('complementary');
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find((b) => b.querySelector('svg')); // Find button with chevron icon

    // Initially expanded - check for w-56 (default)
    expect(aside.className).toContain('w-56');

    if (toggleButton) {
      // Click collapse
      fireEvent.click(toggleButton);
      expect(aside.className).toContain('w-16');

      // Click expand
      fireEvent.click(toggleButton);
      expect(aside.className).toContain('w-56');
    }
  });

  it('renders UserNav in the header', () => {
    renderLayout(<div>Content</div>);

    // UserNav has an avatar/initials or trigger
    const mainArea = screen.getByRole('main').parentElement;
    const header = mainArea?.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain('z-[90]');
    expect(document.getElementById('admin-user-nav-trigger')?.className).toContain('z-[95]');
  });
});
