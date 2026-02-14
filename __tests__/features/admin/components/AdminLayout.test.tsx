import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { server } from '@/mocks/server';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ToastProvider } from '@/shared/ui/toast';

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
  SessionProvider: ({ children }: any) => children,
}));

// Mock NoteSettingsProvider
vi.mock('@/features/notesapp', () => ({
  NoteSettingsProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const createTestQueryClient = () => new QueryClient({
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
          <AdminLayout>
            {children}
          </AdminLayout>
        </ToastProvider>
      </SettingsStoreProvider>
    </QueryClientProvider>
  );
};

describe('AdminLayout', () => {
  beforeEach(() => {
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
  });

  it('can collapse and expand the sidebar', () => {
    renderLayout(<div>Content</div>);

    const aside = screen.getByRole('complementary');
    const toggleButton = screen.getByRole('button', { name: '' }); // The chevron button

    // Initially expanded - check for w-56 (default)
    expect(aside.className).toContain('w-56');

    // Click collapse
    fireEvent.click(toggleButton);
    expect(aside.className).toContain('w-16');
    
    // Click expand
    fireEvent.click(toggleButton);
    expect(aside.className).toContain('w-56');
  });

  it('renders UserNav in the header', () => {
    renderLayout(<div>Content</div>);

    // UserNav has an avatar/initials or trigger
    const mainArea = screen.getByRole('main').parentElement;
    const header = mainArea?.querySelector('header');
    expect(header).toBeInTheDocument();
  });
});
