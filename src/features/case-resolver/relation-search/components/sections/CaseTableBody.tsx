'use client';

import React, { useMemo, useCallback } from 'react';
import { DataTable } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import { getCaseTableColumns } from './CaseTableColumns';

export function CaseTableBody(): React.JSX.Element {
  const {
    visibleCaseRows: rows,
    setSelectedDrillCaseId,
    setDocumentSearchQuery,
    setSelectedSearchFolderPath,
  } = useDocumentRelationSearchContext();

  const onDrillInto = useCallback(
    (caseId: string) => {
      setSelectedDrillCaseId(caseId);
      setDocumentSearchQuery('');
      setSelectedSearchFolderPath(null);
    },
    [setSelectedDrillCaseId, setDocumentSearchQuery, setSelectedSearchFolderPath]
  );

  const columns = useMemo(() => getCaseTableColumns({ onDrillInto }), [onDrillInto]);

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
