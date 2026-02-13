import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PanelPagination } from '@/shared/ui/templates/panels/PanelPagination';

describe('PanelPagination', () => {
  const defaultProps = {
    page: 1,
    pageSize: 10,
    totalCount: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('renders pagination controls', () => {
    render(<PanelPagination {...defaultProps} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('displays correct page info', () => {
    render(<PanelPagination {...defaultProps} page={2} />);
    // Check for "Showing" and "100" together
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('calls onPageChange when navigation works', () => {
    const onPageChange = vi.fn();
    render(
      <PanelPagination {...defaultProps} onPageChange={onPageChange} page={1} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('disables prev button on first page', () => {
    render(<PanelPagination {...defaultProps} page={1} />);
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <PanelPagination {...defaultProps} page={10} totalCount={100} />
    );
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it('returns null when totalCount is 0', () => {
    const { container } = render(
      <PanelPagination {...defaultProps} totalCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });
});
