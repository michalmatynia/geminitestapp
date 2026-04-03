// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders page info and fires previous/next page handlers', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        page={2}
        pageSize={20}
        totalCount={60}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        showInfo={true}
        showPageSize={true}
      />
    );

    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 21-40 of 60 results');
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Page 2 of 3').length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('returns null when pagination is unnecessary', () => {
    const { container } = render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={0}
        onPageChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
