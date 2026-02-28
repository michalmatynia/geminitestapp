import React from 'react';
import { Pagination } from '@/shared/ui';

export type DatabasePaginationProps = {
  totalRows: number;
  page: number;
  maxPage: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
};

export function DatabasePagination({
  totalRows,
  page,
  maxPage,
  setPage,
  pageSize,
  setPageSize,
}: DatabasePaginationProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between border-t border-border px-4 py-2 bg-card/20'>
      <span className='text-xs text-gray-500 font-mono'>
        {totalRows.toLocaleString()} total rows
      </span>
      <Pagination
        page={page}
        totalPages={maxPage}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        showPageSize
        variant='compact'
      />
    </div>
  );
}
