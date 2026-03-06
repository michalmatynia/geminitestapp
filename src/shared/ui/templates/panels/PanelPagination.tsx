'use client';

import React, { useMemo } from 'react';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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

type PanelPaginationRuntimeValue = {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions: number[];
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showInfo: boolean;
  className?: string;
};

const { Context: PanelPaginationRuntimeContext, useStrictContext: usePanelPaginationRuntime } =
  createStrictContext<PanelPaginationRuntimeValue>({
    hookName: 'usePanelPaginationRuntime',
    providerName: 'PanelPaginationRuntimeProvider',
    displayName: 'PanelPaginationRuntimeContext',
  });

function PanelPaginationRuntime(): React.JSX.Element {
  const {
    page,
    pageSize,
    totalCount,
    pageSizeOptions,
    isLoading,
    onPageChange,
    onPageSizeChange,
    showInfo,
    className,
  } = usePanelPaginationRuntime();
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
  const runtimeValue = useMemo(
    () => ({
      page,
      pageSize,
      totalCount,
      pageSizeOptions,
      isLoading,
      onPageChange,
      onPageSizeChange,
      showInfo,
      className,
    }),
    [
      className,
      isLoading,
      onPageChange,
      onPageSizeChange,
      page,
      pageSize,
      pageSizeOptions,
      showInfo,
      totalCount,
    ]
  );

  return (
    <PanelPaginationRuntimeContext.Provider value={runtimeValue}>
      <PanelPaginationRuntime />
    </PanelPaginationRuntimeContext.Provider>
  );
};

PanelPagination.displayName = 'PanelPagination';
