'use client';

import React, { useMemo } from 'react';
import { DataTable } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import { getDocumentTableColumns } from './DocumentTableColumns';

export function DocumentTableBody(): React.JSX.Element {
  const {
    currentDocRows: rows,
    isAllCases,
    isLocked,
    onLinkFile,
    selectedFileIds,
    toggleFileSelection,
    selectAllVisible,
    clearSelection,
    allVisibleSelected,
    someVisibleSelected,
    setPreviewFileId,
  } = useDocumentRelationSearchContext();

  const columns = useMemo(
    () =>
      getDocumentTableColumns({
        isAllCases,
        isLocked,
        onLinkFile,
        selectedFileIds,
        toggleFileSelection,
        selectAllVisible,
        clearSelection,
        allVisibleSelected,
        someVisibleSelected,
        setPreviewFileId,
      }),
    [
      isAllCases,
      isLocked,
      onLinkFile,
      selectedFileIds,
      toggleFileSelection,
      selectAllVisible,
      clearSelection,
      allVisibleSelected,
      someVisibleSelected,
      setPreviewFileId,
    ]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      className='border-none'
      getRowId={(row) => row.file.id}
      getRowClassName={() => 'border-border/20 transition-colors hover:bg-card/50'}
      stickyHeader
    />
  );
}
