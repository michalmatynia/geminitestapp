import { render, screen, waitFor } from "../../../../test-utils";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminFrontManagePage } from '@/features/admin/pages/AdminFrontManagePage';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/useSettings';
import { useToast } from '@/shared/ui';

// Mock shared hooks
vi.mock('@/shared/hooks/useSettings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
}));

// Mock useToast
vi.mock('@/shared/ui', async () => ({
  ...(await vi.importActual<any>('@/shared/ui')),
  useToast: vi.fn(() => ({ toast: vi.fn() })),
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
  ),
  SectionHeader: ({ title, description, eyebrow }: any) => (
    <div>
      {eyebrow}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
  SectionPanel: ({ children }: any) => <div>{children}</div>,
}));

describe('AdminFrontManagePage', () => {
  const mockMutateAsync = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateSetting as any).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it('renders loading state', () => {
    (useSettingsMap as any).mockReturnValue({ isPending: true });
    render(<AdminFrontManagePage />);
    expect(screen.getByText(/Loading front page settings/i)).toBeInTheDocument();
  });

  it('renders initial selected option from settings', () => {
    (useSettingsMap as any).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'chatbot']]),
    });

    render(<AdminFrontManagePage />);
    
    // The "Chatbot" button should have the selected styling (blue-500/10)
    const chatbotButton = screen.getByRole('button', { name: /Chatbot Open the admin chatbot workspace/i });
    expect(chatbotButton).toHaveClass('border-blue-500/60');
  });

  it('allows changing selection and saving', async () => {
    (useSettingsMap as any).mockReturnValue({
      isPending: false,
      data: new Map([['front_page_app', 'products']]),
    });

    render(<AdminFrontManagePage />);

    // Select "Notes"
    const notesButton = screen.getByRole('button', { name: /Notes Open the admin notes workspace/i });
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
});
