import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { DraftCreator } from '@/shared/lib/drafter/components/DraftCreator';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useToast
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
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
      if (url.includes('/api/catalogs')) {
        return Promise.resolve({
          ok: true,
          json: async () => await Promise.resolve([{ id: 'cat-1', name: 'Default Catalog' }]),
        });
      }
      return Promise.resolve({ ok: true, json: async () => await Promise.resolve([]) });
    });
  });

  it('should render the form with initial state', async () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('Draft Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/Draft Name/i)).toBeInTheDocument();

    // Check if it fetched catalogs
    await waitFor(() => {
      const fetchCalls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      expect(
        fetchCalls.some(([url]) => typeof url === 'string' && url.includes('/api/catalogs'))
      ).toBe(true);
    });
  });

  it('should update name input correctly', () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);

    const nameInput = screen.getByLabelText(/Draft Name/i);
    fireEvent.change(nameInput, { target: { value: 'My New Draft' } });

    expect(nameInput).toHaveValue('My New Draft');
  });

  it('should show validation error if saving without a name', () => {
    const onSaveSuccess = vi.fn();
    const { container } = render(
      <DraftCreator draftId={null} onSaveSuccess={onSaveSuccess} onCancel={vi.fn()} />
    );

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
    });

    expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it('should open icon selector modal', async () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);

    const chooseIconButton = screen.getByRole('button', { name: /Choose Icon/i });
    fireEvent.click(chooseIconButton);

    expect(screen.getByText(/Search and pick an icon/i)).toBeInTheDocument();
  });
});
