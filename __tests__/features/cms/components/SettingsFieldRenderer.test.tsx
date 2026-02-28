import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import { SettingsFieldRenderer } from '@/features/cms/components/page-builder/SettingsFieldRenderer';
import { ThemeSettingsProvider } from '@/features/cms/components/page-builder/ThemeSettingsContext';
import { ToastProvider } from '@/shared/ui';

// Mock MediaLibraryPanel
vi.mock('@/features/cms/components/page-builder/MediaLibraryPanel', () => ({
  MediaLibraryPanel: () => <div data-testid='media-library' />,
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <ThemeSettingsProvider>{children}</ThemeSettingsProvider>
    </ToastProvider>
  </QueryClientProvider>
);

describe('SettingsFieldRenderer Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render and handle a text field', () => {
    const field = { key: 'title', label: 'Title', type: 'text' as const };
    render(<SettingsFieldRenderer field={field} value='Hello' onChange={mockOnChange} />, {
      wrapper,
    });

    const input = screen.getByDisplayValue('Hello');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'New Title' } });
    expect(mockOnChange).toHaveBeenCalledWith('title', 'New Title');
  });

  it('should render and handle a number field', () => {
    const field = { key: 'count', label: 'Count', type: 'number' as const };
    render(<SettingsFieldRenderer field={field} value={10} onChange={mockOnChange} />, { wrapper });

    const input = screen.getByDisplayValue(10);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '20' } });
    expect(mockOnChange).toHaveBeenCalledWith('count', 20);
  });

  it('should render and handle a color field', () => {
    const field = { key: 'bg', label: 'Background', type: 'color' as const };
    render(<SettingsFieldRenderer field={field} value='#ff0000' onChange={mockOnChange} />, {
      wrapper,
    });

    // Use getAllByDisplayValue because both color picker and text input have it
    const inputs = screen.getAllByDisplayValue('#ff0000');
    const textInput = inputs.find(
      (i) => i.tagName === 'INPUT' && (i as HTMLInputElement).type === 'text'
    );

    fireEvent.change(textInput!, { target: { value: '#00ff00' } });
    expect(mockOnChange).toHaveBeenCalledWith('bg', '#00ff00');
  });

  it('should render and handle a spacing field', () => {
    const field = { key: 'padding', label: 'Padding', type: 'spacing' as const };
    const value = { top: 10, right: 20, bottom: 30, left: 40 }; // Different values to avoid ambiguity
    render(<SettingsFieldRenderer field={field} value={value} onChange={mockOnChange} />, {
      wrapper,
    });

    expect(screen.getByText('Padding')).toBeInTheDocument();

    const topInput = screen.getByDisplayValue(10);
    fireEvent.change(topInput, { target: { value: '15' } });

    expect(mockOnChange).toHaveBeenCalledWith('padding', { ...value, top: 15 });
  });

  it('should render and handle a range field', () => {
    const field = { key: 'width', label: 'Width', type: 'range' as const, min: 0, max: 100 };
    render(<SettingsFieldRenderer field={field} value={50} onChange={mockOnChange} />, { wrapper });

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('50');

    fireEvent.change(slider, { target: { value: '75' } });
    expect(mockOnChange).toHaveBeenCalledWith('width', 75);
  });
});
