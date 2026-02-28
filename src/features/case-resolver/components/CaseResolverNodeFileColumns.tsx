'use client';

import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';

import { StatusBadge } from '@/shared/ui';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { NodeFileDocumentSearchRow } from './CaseResolverNodeFileUtils';

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
        <button
          type='button'
          title='Add to canvas center'
          className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
          onClick={(e) => {
            e.stopPropagation();
            onAddDocument(row.original.file);
          }}
        >
          <Plus className='size-3.5' />
        </button>
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
      <span className='text-gray-400'>{row.original.docCount}</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }): React.JSX.Element => (
      <button
        type='button'
        title='Browse documents in this case'
        className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
        onClick={() => onDrillInto(row.original.file.id)}
      >
        <ChevronRight className='size-3.5' />
      </button>
    ),
    size: 40,
  },
];
