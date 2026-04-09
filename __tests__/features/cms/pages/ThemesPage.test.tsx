import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useCmsThemes, useDeleteTheme } from '@/features/cms/hooks/useCmsQueries';
import ThemesPage from '@/features/cms/pages/themes/ThemesPage';

// Mock hooks
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'emptyDescription': 'No themes defined',
      'createAction': 'Create Theme',
      'actionsLabel': 'Actions for theme Dark',
      'deleteAction': 'Delete',
      'destroyAction': 'Destroy Theme',
    };
    return translations[key] || key;
  }),
  useLocale: vi.fn(() => 'pl'),
}));

vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsThemes: vi.fn(),
  useDeleteTheme: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/admin/cms/themes'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/admin/cms/themes'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('ThemesPage Component', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useDeleteTheme as any).mockReturnValue({ mutateAsync: vi.fn() });
  });

  const renderWithProviders = (ui: React.ReactNode) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('should render empty state when no themes exist', () => {
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<ThemesPage />);
    expect(screen.getByText('No themes defined')).toBeInTheDocument();
  });

  it('should render themes list', () => {
    const mockThemes = [
      { id: 't1', name: 'Modern Dark', colors: { primary: '#000' }, updatedAt: '2024-01-01' },
      { id: 't2', name: 'Minimal Light', colors: { primary: '#fff' }, updatedAt: '2024-01-01' },
    ];
    (useCmsThemes as any).mockReturnValue({ data: mockThemes, isLoading: false });

    renderWithProviders(<ThemesPage />);
    expect(screen.getByText('Modern Dark')).toBeInTheDocument();
    expect(screen.getByText('Minimal Light')).toBeInTheDocument();
  });

  it('should navigate to create page when button is clicked', async () => {
    const user = userEvent.setup();
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<ThemesPage />);

    const createBtn = screen.getByRole('button', { name: /Create Theme/i });
    await user.click(createBtn);

    expect(mockPush).toHaveBeenCalledWith('/admin/cms/themes/create');
  });

  it('should handle theme deletion', async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn().mockResolvedValue({});
    (useDeleteTheme as any).mockReturnValue({ mutateAsync: mockDelete });
    (useCmsThemes as any).mockReturnValue({
      data: [{ id: 't1', name: 'Dark', colors: { p: '#000' }, updatedAt: '2024-01-01' }],
      isLoading: false,
    });

    renderWithProviders(<ThemesPage />);

    // 1. Open the ActionMenu
    const actionsBtn = screen.getByLabelText(/Actions for theme Dark/i);
    await user.click(actionsBtn);

    // 2. Click the Delete item in dropdown
    const deleteItem = screen.getByText('Delete');
    await user.click(deleteItem);

    // 3. Confirm in the modal
    const confirmBtn = screen.getByRole('button', { name: /Destroy Theme/i });
    await user.click(confirmBtn);

    expect(mockDelete).toHaveBeenCalledWith('t1');
  });
});
