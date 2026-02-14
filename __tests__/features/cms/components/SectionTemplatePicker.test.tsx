
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { SectionTemplatePicker } from '@/features/cms/components/page-builder/SectionTemplatePicker';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';

// Mock hooks
vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: vi.fn(),
}));

// Mock templates - use absolute path to ensure Vitest catches it
vi.mock('/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/cms/components/page-builder/section-templates.ts', () => ({
  getTemplatesByCategory: () => ({
    'Hero': [{ 
      name: 'Standard Hero', 
      description: 'Desc', 
      create: () => ({ id: 'new-sec', type: 'Hero', settings: {}, blocks: [] }) 
    }]
  }),
}));

// Fallback mock if absolute path doesn't work in some environments
vi.mock('@/features/cms/components/page-builder/section-templates', () => ({
  getTemplatesByCategory: () => ({
    'Hero': [{ 
      name: 'Standard Hero', 
      description: 'Desc', 
      create: () => ({ id: 'new-sec', type: 'Hero', settings: {}, blocks: [] }) 
    }]
  }),
}));

// Mock Dialog
vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual('@/shared/ui');
  return {
    ...actual,
    Dialog: ({ children }: any) => <div data-testid='dialog'>{children}</div>,
    DialogContent: ({ children }: any) => <div data-testid='dialog-content'>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div data-testid='dialog-trigger'>{children}</div>,
  };
});

describe('SectionTemplatePicker Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show mocked template', () => {
    render(<SectionTemplatePicker zone='template' onSelect={mockOnSelect} />);
    
    // If mock works, it should find "Standard Hero"
    expect(screen.getByText('Standard Hero')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });

  it('should call onSelect when a template is selected', () => {
    render(<SectionTemplatePicker zone='header' onSelect={mockOnSelect} />);
    
    const templateItem = screen.getByText('Standard Hero').closest('[role="gridcell"]');
    expect(templateItem).toBeInTheDocument();
    fireEvent.click(templateItem!);

    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Standard Hero',
    }));
  });
});