'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip } from '@/shared/ui';
import { useDocumentRelationSearchContext, type CaseRow } from '../../context/DocumentRelationSearchContext';
import { getCaseResolverDocTooltip } from '../../utils/docs';

export function CaseTableBody(): React.JSX.Element {
  const {
    visibleCaseRows: rows,
    setSelectedDrillCaseId,
    setDocumentSearchQuery,
    setSelectedSearchFolderPath,
  } = useDocumentRelationSearchContext();

  const onDrillInto = (caseId: string) => {
    setSelectedDrillCaseId(caseId);
    setDocumentSearchQuery('');
    setSelectedSearchFolderPath(null);
  };

  return (
    <Table className='text-xs'>
      <TableHeader className='sticky top-0 z-10 bg-card/90 backdrop-blur-sm'>
        <TableRow className='border-border/40 text-left text-gray-500 hover:bg-transparent'>
          <TableHead className='h-8 py-1 pl-3 pr-2 font-medium'>Signature ID</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Case</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Status</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Docs</TableHead>
          <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className='border-border/20 hover:bg-transparent'>
            <TableCell colSpan={5} className='h-20 py-3 text-center text-gray-500'>
              No cases found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row: CaseRow) => (
            <TableRow
              key={row.file.id}
              className='border-border/20 transition-colors hover:bg-card/50'
            >
              <TableCell className='h-9 max-w-[160px] py-1 pl-3 pr-2'>
                <span
                  className='block truncate font-medium text-gray-200'
                  title={row.signatureLabel || row.file.name}
                >
                  {row.signatureLabel || '—'}
                </span>
              </TableCell>
              <TableCell className='h-9 max-w-[140px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.file.name}
                >
                  {row.file.name}
                </span>
              </TableCell>
              <TableCell className='h-9 px-2 py-1'>
                <StatusBadge
                  status={row.file.caseStatus ?? 'pending'}
                  variant={row.file.caseStatus === 'completed' ? 'success' : 'warning'}
                  size='sm'
                />
              </TableCell>
              <TableCell className='h-9 px-2 py-1'>
                <span className='rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300'>
                  {row.docCount}
                </span>
              </TableCell>
              <TableCell className='h-9 py-1 pl-2 pr-3'>
                <Tooltip content={getCaseResolverDocTooltip('browseCaseDocs')} side='left'>
                  <button
                    type='button'
                    className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
                    onClick={() => onDrillInto(row.file.id)}
                  >
                    <ChevronRight className='size-3.5' />
                  </button>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
