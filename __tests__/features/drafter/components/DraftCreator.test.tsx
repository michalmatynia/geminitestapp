import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { DraftCreator } from '@/features/drafter/components/DraftCreator';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock useToast
vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

describe('DraftCreator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for metadata
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/v2/products/entities/catalogs')) {
        return Promise.resolve({
          ok: true,
          json: async () => await Promise.resolve([{ id: 'cat-1', name: 'Default Catalog' }]),
        });
      }
      return Promise.resolve({ ok: true, json: async () => await Promise.resolve([]) });
    });
  });

  const renderDraftCreator = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );
  };

  it('should render the form with initial state', async () => {
    renderDraftCreator();

    expect(screen.getByText('Draft Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/Draft Name/i)).toBeInTheDocument();

    // Check if it fetched catalogs
    await waitFor(() => {
      const fetchCalls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      expect(
        fetchCalls.some(
          ([url]) =>
            typeof url === 'string' && url.includes('/api/v2/products/entities/catalogs')
        )
      ).toBe(true);
    });
  });

  it('should update name input correctly', () => {
    renderDraftCreator();

    const nameInput = screen.getByLabelText(/Draft Name/i);
    fireEvent.change(nameInput, { target: { value: 'My New Draft' } });

    expect(nameInput).toHaveValue('My New Draft');
  });

  it('should show validation error if saving without a name', () => {
    const onSaveSuccess = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <DraftCreator draftId={null} onSaveSuccess={onSaveSuccess} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
    });

    expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it('should open icon selector modal', async () => {
    renderDraftCreator();

    const chooseIconButton = screen.getByRole('button', { name: /Choose Icon/i });
    fireEvent.click(chooseIconButton);

    expect(screen.getByText(/Search and pick an icon/i)).toBeInTheDocument();
  });
});
