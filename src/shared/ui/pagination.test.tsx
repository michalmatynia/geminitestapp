// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('submits a typed page jump on Enter when enabled', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        page={2}
        totalPages={8}
        pageSize={20}
        onPageChange={onPageChange}
        showPageJump={true}
        variant='compact'
      />
    );

    const input = screen.getByRole('textbox', { name: 'Jump to page' });
    await user.clear(input);
    await user.type(input, '6{enter}');

    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('clamps a typed page jump to the last available page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        page={2}
        totalPages={8}
        pageSize={20}
        onPageChange={onPageChange}
        showPageJump={true}
        variant='compact'
      />
    );

    const input = screen.getByRole('textbox', { name: 'Jump to page' });
    await user.clear(input);
    await user.type(input, '99');
    fireEvent.blur(input);

    expect(onPageChange).toHaveBeenCalledWith(8);
    expect(input).toHaveValue('8');
  });

  it('resets an empty page jump back to the current page without changing pagination', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        page={4}
        totalPages={8}
        pageSize={20}
        onPageChange={onPageChange}
        showPageJump={true}
        variant='compact'
      />
    );

    const input = screen.getByRole('textbox', { name: 'Jump to page' });
    await user.clear(input);
    fireEvent.blur(input);

    expect(onPageChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('4');
  });
});
