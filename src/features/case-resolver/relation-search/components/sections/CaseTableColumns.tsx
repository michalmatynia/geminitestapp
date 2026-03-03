import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';

import { StatusBadge, Tooltip } from '@/shared/ui';
import type { CaseRow } from '@/shared/contracts/case-resolver';
import { getCaseResolverDocTooltip } from '@/features/case-resolver/relation-search/utils/docs';

export interface CaseTableColumnProps {
  onDrillInto: (caseId: string) => void;
}

export const getCaseTableColumns = ({
  onDrillInto,
}: CaseTableColumnProps): ColumnDef<CaseRow>[] => [
  {
    accessorKey: 'signatureLabel',
    header: 'Signature ID',
    cell: ({ row }: { row: Row<CaseRow> }): React.JSX.Element => (
      <span
        className='block truncate font-medium text-gray-200'
        title={row.original.signatureLabel || row.original.file.name}
      >
        {row.original.signatureLabel || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'file.name',
    header: 'Case',
    cell: ({ row }: { row: Row<CaseRow> }): React.JSX.Element => (
      <span className='block truncate text-gray-400' title={row.original.file.name}>
        {row.original.file.name}
      </span>
    ),
  },
  {
    accessorKey: 'file.caseStatus',
    header: 'Status',
    cell: ({ row }: { row: Row<CaseRow> }): React.JSX.Element => (
      <StatusBadge
        status={row.original.file.caseStatus ?? 'pending'}
        variant={row.original.file.caseStatus === 'completed' ? 'success' : 'warning'}
        size='sm'
      />
    ),
  },
  {
    accessorKey: 'docCount',
    header: 'Docs',
    cell: ({ row }: { row: Row<CaseRow> }): React.JSX.Element => (
      <span className='rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300'>
        {row.original.docCount}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }: { row: Row<CaseRow> }): React.JSX.Element => (
      <Tooltip content={getCaseResolverDocTooltip('browseCaseDocs')} side='left'>
        <button
          type='button'
          className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
          onClick={() => onDrillInto(row.original.file.id)}
        >
          <ChevronRight className='size-3.5' />
        </button>
      </Tooltip>
    ),
    size: 40,
  },
];
