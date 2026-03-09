import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { AdminFrontManagePage } from '@/features/admin/pages/AdminFrontManagePage';
import { useSettingsMap, useUpdateSetting, useLiteSettingsMap } from '@/shared/hooks/use-settings';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

// Mock shared hooks
vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
  useLiteSettingsMap: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Mock useToast
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = (await importOriginal());
  return {
    ...actual,
    useToast: vi.fn(() => ({ toast: vi.fn() })),
  };
});

describe('AdminFrontManagePage', () => {
  const mockMutateAsync = vi.fn();
  const mockToast = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(useUpdateSetting).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSetting>);
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as unknown as ReturnType<typeof useToast>);
    vi.mocked(useLiteSettingsMap).mockReturnValue({
      isPending: false,
      data: new Map(),
    } as unknown as ReturnType<typeof useLiteSettingsMap>);
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsStoreProvider>
          <AdminFrontManagePage />
        </SettingsStoreProvider>
      </QueryClientProvider>
    );

  it('renders loading state', () => {
    vi.mocked(useSettingsMap).mockReturnValue({ isPending: true } as unknown as ReturnType<typeof useSettingsMap>);
    renderPage();
    expect(screen.getByText(/Loading front page settings/i)).toBeInTheDocument();
  });

  it('renders initial selected option from settings', () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'chatbot']]),
    } as unknown as ReturnType<typeof useSettingsMap>);

    renderPage();

    // The "Chatbot" button should have the selected styling (blue-500/10)
    const chatbotButton = screen.getByRole('button', {
      name: /Chatbot Open the admin chatbot workspace on the home page/i,
    });
    expect(chatbotButton).toHaveClass('border-blue-500/60');
  });

  it('renders the Kangur option', () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'products']]),
    } as unknown as ReturnType<typeof useSettingsMap>);

    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Kangur Mount Kangur at \/ and let it own the full public frontend/i,
      })
    ).toBeInTheDocument();
  });

  it('allows changing selection and saving', async () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'products']]),
    } as unknown as ReturnType<typeof useSettingsMap>);

    renderPage();

    // Select "Notes"
    const notesButton = screen.getByRole('button', {
      name: /Notes Open the admin notes workspace on the home page/i,
    });
    fireEvent.click(notesButton);

    // Save
    const saveButton = screen.getByText(/Save Selection/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'notes',
      });
      expect(mockToast).toHaveBeenCalledWith('Front page updated', { variant: 'success' });
    });
  });

  it('allows selecting Kangur and saving', async () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'products']]),
    } as unknown as ReturnType<typeof useSettingsMap>);

    renderPage();

    const kangurButton = screen.getByRole('button', {
      name: /Kangur Mount Kangur at \/ and let it own the full public frontend/i,
    });
    fireEvent.click(kangurButton);

    fireEvent.click(screen.getByText(/Save Selection/i));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'kangur',
      });
    });
  });
});
