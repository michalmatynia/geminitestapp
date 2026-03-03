'use client';

import React from 'react';
import { Pagination } from '@/shared/ui/pagination';

interface PanelPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showInfo?: boolean;
  className?: string;
}

/**
 * PanelPagination - Standardized pagination for data panels.
 * Now a thin wrapper around the unified Pagination component.
 */
export const PanelPagination: React.FC<PanelPaginationProps> = ({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [5, 10, 20, 50],
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  showInfo = true,
  className,
}) => {
  return (
    <Pagination
      variant='panel'
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      pageSizeOptions={pageSizeOptions}
      isLoading={isLoading}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      showInfo={showInfo}
      className={className}
    />
  );
};

PanelPagination.displayName = 'PanelPagination';
