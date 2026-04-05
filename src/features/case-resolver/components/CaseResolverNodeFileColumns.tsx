import { ChevronRight, Plus } from 'lucide-react';
import React from 'react';


import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Button, Tooltip, Badge } from '@/shared/ui/primitives.public';

import { getCaseResolverDocTooltipWithFallback } from '../relation-search/utils/docs';

import type { NodeFileDocumentSearchRow } from './CaseResolverNodeFileUtils';
import type { ColumnDef, Row } from '@tanstack/react-table';

export interface NodeFileDocumentColumnsProps {
  isAllCases: boolean;
  onAddDocument: (file: CaseResolverFile) => void;
}

export const getNodeFileDocumentColumns = ({
  isAllCases,
  onAddDocument,
}: NodeFileDocumentColumnsProps): ColumnDef<NodeFileDocumentSearchRow>[] => {
  const columns: ColumnDef<NodeFileDocumentSearchRow>[] = [
    {
      accessorKey: 'file.name',
      header: 'Name',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span className='block truncate text-gray-200' title={row.original.file.name}>
          {row.original.file.name}
        </span>
      ),
    },
    {
      accessorKey: 'folderPath',
      header: 'Folder',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span className='block truncate text-gray-400' title={row.original.folderPath || '—'}>
          {row.original.folderPath || '—'}
        </span>
      ),
    },
  ];

  if (isAllCases) {
    columns.push({
      accessorKey: 'signatureLabel',
      header: 'Signature',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span
          className='block truncate text-cyan-400/80'
          title={row.original.signatureLabel || '—'}
        >
          {row.original.signatureLabel || '—'}
        </span>
      ),
    });
  }

  columns.push(
    {
      accessorKey: 'addresserLabel',
      header: 'From',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span className='block truncate text-gray-400' title={row.original.addresserLabel || '—'}>
          {row.original.addresserLabel || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'addresseeLabel',
      header: 'To',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span className='block truncate text-gray-400' title={row.original.addresseeLabel || '—'}>
          {row.original.addresseeLabel || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <Tooltip
          content={getCaseResolverDocTooltipWithFallback(
            'addToCanvasCenter',
            'Add to canvas center'
          )}
          side='left'
        >
          <Button
            variant='ghost'
            size='sm'
            className='size-7 p-0 text-gray-400 hover:bg-cyan-500/15 hover:text-cyan-300'
            aria-label='Add to canvas center'
            onClick={(e) => {
              e.stopPropagation();
              onAddDocument(row.original.file);
            }}
            title={'Add to canvas center'}>
            <Plus className='size-3.5' />
          </Button>
        </Tooltip>
      ),
      size: 40,
    }
  );

  return columns;
};

export interface NodeFileCaseColumnsProps {
  onDrillInto: (caseId: string) => void;
}

export const getNodeFileCaseColumns = ({
  onDrillInto,
}: NodeFileCaseColumnsProps): ColumnDef<{
  file: CaseResolverFile;
  signatureLabel: string;
  docCount: number;
}>[] => [
  {
    accessorKey: 'signatureLabel',
    header: 'Signature ID',
    cell: ({ row }): React.JSX.Element => (
      <span
        className='block truncate text-gray-200'
        title={row.original.signatureLabel || row.original.file.name}
      >
        {row.original.signatureLabel || row.original.file.name}
      </span>
    ),
  },
  {
    accessorKey: 'file.caseStatus',
    header: 'Status',
    cell: ({ row }): React.JSX.Element => (
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
    cell: ({ row }): React.JSX.Element => (
      <Badge
        variant='outline'
        className='bg-blue-500/5 text-blue-300 border-blue-500/20 text-[10px] h-5 px-1.5'
      >
        {row.original.docCount}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }): React.JSX.Element => (
      <Tooltip
        content={getCaseResolverDocTooltipWithFallback(
          'browseCaseDocs',
          'Browse documents in this case'
        )}
        side='left'
      >
        <Button
          variant='ghost'
          size='sm'
          className='size-7 p-0 text-gray-400 hover:bg-cyan-500/15 hover:text-cyan-300'
          aria-label='Browse case documents'
          onClick={() => onDrillInto(row.original.file.id)}
          title={'Browse case documents'}>
          <ChevronRight className='size-3.5' />
        </Button>
      </Tooltip>
    ),
    size: 40,
  },
];
