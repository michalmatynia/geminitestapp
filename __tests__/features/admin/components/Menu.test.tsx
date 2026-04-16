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

  it('opens collapsible section when clicked', () => {
    renderMenu();
    const commerceTrigger = screen.getByText('Commerce');
    fireEvent.click(commerceTrigger);

    // Now "Products" should be visible
    expect(screen.getByText('Products')).toBeInTheDocument();

    const productsTrigger = screen.getByText('Products');
    fireEvent.click(productsTrigger);

    // Check if sub-items are visible
    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('navigates to create page and collapses menu when Create Page is clicked', async () => {
    renderMenu();
    const contentTrigger = await screen.findByText('Content');
    fireEvent.click(contentTrigger);

    const cmsTrigger = await screen.findByText('CMS');
    fireEvent.click(cmsTrigger);

    const createPageButton = await screen.findByText('Create Page');
    // Ensure we are clicking the actual link/button
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

    const workspaceTrigger = screen.getByText('Workspace');
    fireEvent.click(workspaceTrigger);

    // Use findByRole to wait for potential effects/updates
    const filesLink = await screen.findByRole('link', { name: /Files/i });
    expect(filesLink).toHaveAttribute('href', '/admin/files');

    const systemTrigger = screen.getByText('System');
    fireEvent.click(systemTrigger);
    const systemLogsLink = await screen.findByRole('link', { name: /System Logs/i });
    expect(systemLogsLink).toHaveAttribute('href', '/admin/system/logs');
  });

  it('prefetches admin links on intent without prefetching the whole menu upfront', async () => {
    renderMenu();

    const workspaceTrigger = screen.getByText('Workspace');
    fireEvent.click(workspaceTrigger);

    const filesLink = await screen.findByRole('link', { name: /Files/i });
    fireEvent.mouseEnter(filesLink);
    fireEvent.focus(filesLink);

    expect(mockPrefetch).toHaveBeenCalledWith('/admin/files');
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });
});
