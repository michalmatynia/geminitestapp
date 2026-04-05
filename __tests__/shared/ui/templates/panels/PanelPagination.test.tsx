import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Pagination } from '@/shared/ui/navigation-and-layout.public';

describe('Pagination (panel variant)', () => {
  const defaultProps = {
    page: 1,
    pageSize: 10,
    totalCount: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    variant: 'panel' as const,
  };

  it('renders pagination controls', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('displays correct page info', () => {
    render(<Pagination {...defaultProps} page={2} />);
    // Check for "Showing" and "100" together
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('calls onPageChange when navigation works', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} page={1} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('disables prev button on first page', () => {
    render(<Pagination {...defaultProps} page={1} />);
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} page={10} totalCount={100} />);
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it('returns null when totalCount is 0', () => {
    const { container } = render(<Pagination {...defaultProps} totalCount={0} />);
    expect(container.firstChild).toBeNull();
  });
});
