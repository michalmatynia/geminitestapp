import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { FilterPanel } from '@/shared/ui/templates/FilterPanel';

describe('FilterPanel', () => {
  const defaultProps = {
    filters: [
      { key: 'status', label: 'Status', type: 'select' as const, options: [{ label: 'Active', value: 'active' }] },
      { key: 'type', label: 'Type', type: 'text' as const },
    ],
    values: { status: '', type: '' },
    onFilterChange: vi.fn(),
  };

  it('renders filter controls', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<FilterPanel {...defaultProps} searchPlaceholder='Find items...' />);
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
  });

  it('renders presets', () => {
    const presets = [
      { label: 'Recent', values: { status: 'active' } },
      { label: 'Draft', values: { status: 'draft' } },
    ];
    render(<FilterPanel {...defaultProps} presets={presets} />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('calls onApplyPreset when preset is clicked', () => {
    const onApplyPreset = vi.fn();
    const presets = [{ label: 'Active', values: { status: 'active' } }];
    render(<FilterPanel {...defaultProps} presets={presets} onApplyPreset={onApplyPreset} />);
    fireEvent.click(screen.getByText('Active'));
    expect(onApplyPreset).toHaveBeenCalledWith({ status: 'active' });
  });

  it('shows active filter count', () => {
    render(
      <FilterPanel
        {...defaultProps}
        values={{ status: 'active', type: 'product' }}
      />
    );
    expect(screen.getByText(/2 filters active/)).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    render(<FilterPanel {...defaultProps} showHeader={false} />);
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('uses custom header title', () => {
    render(<FilterPanel {...defaultProps} headerTitle='Advanced Filters' />);
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });
});
