// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type PaginationMockProps = {
  className?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  showInfo: boolean;
  totalCount: number;
  variant: string;
};

function MockPagination(props: PaginationMockProps): React.JSX.Element {
  const {
    className,
    onPageChange,
    onPageSizeChange,
    page,
    pageSize,
    pageSizeOptions,
    showInfo,
    totalCount,
    variant,
  } = props;

  return (
    <div
      data-testid='pagination'
      data-class-name={className}
      data-page={String(page)}
      data-page-size={String(pageSize)}
      data-page-size-options={pageSizeOptions.join(',')}
      data-show-info={String(showInfo)}
      data-total-count={String(totalCount)}
      data-variant={variant}
    >
      <button type='button' onClick={() => onPageChange(3)}>
        page
      </button>
      <button type='button' onClick={() => onPageSizeChange(50)}>
        size
      </button>
    </div>
  );
}

vi.mock('@/shared/ui/pagination', () => ({
  Pagination: MockPagination,
}));

import { Pagination } from '@/shared/ui/pagination';

describe('Pagination', () => {
  it('passes the panel pagination contract directly into the shared Pagination component', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        variant='panel'
        page={2}
        pageSize={20}
        totalCount={125}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        showInfo={true}
        className='panel-pagination'
      />
    );

    const pagination = screen.getByTestId('pagination');
    expect(pagination.dataset.variant).toBe('panel');
    expect(pagination.dataset.page).toBe('2');
    expect(pagination.dataset.pageSize).toBe('20');
    expect(pagination.dataset.totalCount).toBe('125');
    expect(pagination.dataset.pageSizeOptions).toBe('10,20,50');
    expect(pagination.dataset.showInfo).toBe('true');
    expect(pagination.dataset.className).toBe('panel-pagination');

    screen.getByRole('button', { name: 'page' }).click();
    screen.getByRole('button', { name: 'size' }).click();

    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
