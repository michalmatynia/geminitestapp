import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Menu from '@/features/admin/components/Menu';
import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';

// Mock next/navigation
const mockPush = vi.fn();
const mockPrefetch = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: vi.fn(() => ({
    push: mockPush,
    prefetch: mockPrefetch,
  })),
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: vi.fn(() => ({
    push: mockPush,
    prefetch: mockPrefetch,
  })),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderMenu = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsStoreProvider>
        <AdminLayoutProvider>
          <Menu />
        </AdminLayoutProvider>
      </SettingsStoreProvider>
    </QueryClientProvider>
  );
};

describe('Menu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main menu categories', () => {
    renderMenu();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Commerce')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('opens collapsible section when clicked', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Expand all/i }));

    expect(await screen.findByText('Products')).toBeInTheDocument();
    expect(await screen.findByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('navigates to create page and collapses menu when Create Page is clicked', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Expand all/i }));

    const createPageButton = await screen.findByText('Create Page');
    fireEvent.click(createPageButton.closest('a') || createPageButton);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/admin/cms/pages/create');
      },
      { timeout: 2000 }
    );
  });

  it('contains correctly linked standalone sections', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Expand all/i }));

    // Use findByRole to wait for potential effects/updates
    const filesLink = await screen.findByRole('link', { name: /Files/i });
    expect(filesLink).toHaveAttribute('href', '/admin/files');

    const systemLogsItem = await screen.findByText('System Logs');
    expect(systemLogsItem.closest('a')).toHaveAttribute('href', '/admin/system/logs');
  });

  it('prefetches admin links on intent without prefetching the whole menu upfront', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Expand all/i }));

    const filesLink = await screen.findByRole('link', { name: /Files/i });
    mockPrefetch.mockClear();
    fireEvent.mouseEnter(filesLink);
    fireEvent.focus(filesLink);

    expect(mockPrefetch).toHaveBeenCalledWith('/admin/files');
  });
});
