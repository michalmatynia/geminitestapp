import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { SectionPicker } from '@/features/cms/components/page-builder/SectionPicker';

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: vi.fn().mockReturnValue('[]'),
  }),
}));

vi.mock('@/features/cms/components/page-builder/grid-templates', () => ({
  GRID_TEMPLATE_SETTINGS_KEY: 'grid_templates',
  normalizeGridTemplates: vi.fn((data) => data || []),
  cloneGridTemplateSection: vi.fn(() => ({ type: 'Grid', blocks: [] })),
}));

vi.mock('@/features/cms/components/page-builder/section-registry', () => ({
  getSectionTypesForZone: vi.fn((_zone) => [
    { type: 'Grid', label: 'Grid', allowedBlockTypes: ['Block'] },
    { type: 'TextElement', label: 'Text', allowedBlockTypes: [] },
    { type: 'Header', label: 'Header', allowedBlockTypes: ['Block'] },
  ]),
}));

vi.mock('@/features/cms/components/page-builder/section-template-store', () => ({
  SECTION_TEMPLATE_SETTINGS_KEY: 'section_templates',
  normalizeSectionTemplates: vi.fn((data) => data || []),
  cloneSectionTemplateSection: vi.fn(() => ({ type: 'Header', blocks: [] })),
}));

vi.mock('@/features/cms/components/page-builder/section-templates', () => ({
  getTemplatesByCategory: vi.fn(() => ({})),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => ({
    dispatch: vi.fn(),
  }),
}));

vi.mock('@/shared/ui', () => ({
  AppModal: ({ children, open, onClose, header }: any) => 
    open ? <div data-testid='modal'>{header}{children}<button data-testid='close-btn' onClick={onClose}>Close</button></div> : null,
  Button: ({ children, onClick, ...props }: any) => 
    <button {...props} onClick={onClick}>{children}</button>,
}));

describe('SectionPicker.refactored', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Add section button', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();
  });

  it('opens modal when button clicked', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('calls onSelect when primitive selected', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    
    const gridButtons = screen.getAllByRole('button', { name: /grid/i });
    fireEvent.click(gridButtons[0]);
    
    expect(mockOnSelect).toHaveBeenCalledWith('Grid');
  });

  it('renders Primitives section', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    expect(screen.getByText('Primitives')).toBeInTheDocument();
  });

  it('renders Elements section', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    expect(screen.getByText('Elements')).toBeInTheDocument();
  });

  it('renders Templates section', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} disabled={true} />);
    const button = screen.getByRole('button', { name: /add section/i });
    expect(button).toBeDisabled();
  });

  it('shows modal title', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    expect(screen.getByText('Add a section')).toBeInTheDocument();
  });

  it('closes modal with close button', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    fireEvent.click(screen.getByTestId('close-btn'));
  });

  it('supports different zones', () => {
    const { rerender } = render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    rerender(<SectionPicker zone='main' onSelect={mockOnSelect} />);
    rerender(<SectionPicker zone='footer' onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();
  });

  it('has correct button styling', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    const button = screen.getByRole('button', { name: /add section/i });
    expect(button).toHaveClass('h-7');
    expect(button).toHaveClass('gap-1.5');
  });

  it('renders section categories', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    
    expect(screen.getByText('Primitives')).toBeInTheDocument();
    expect(screen.getByText('Elements')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('handles onSelect callback', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    
    const textElements = screen.getAllByRole('button', { name: /text/i });
    fireEvent.click(textElements[0]);
    
    expect(mockOnSelect).toHaveBeenCalledWith('TextElement');
  });

  it('accepts zone prop changes', () => {
    const { rerender } = render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();
    
    rerender(<SectionPicker zone='sidebar' onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();
  });

  it('renders button with Plus icon styling', () => {
    render(<SectionPicker zone='header' onSelect={mockOnSelect} />);
    const button = screen.getByRole('button', { name: /add section/i });
    expect(button.textContent).toContain('Add section');
  });
});
