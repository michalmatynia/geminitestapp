import React from 'react';
import { Lock, Plus } from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';

import { Checkbox, Tooltip } from '@/shared/ui';
import type { NodeFileDocumentSearchRow } from '../../../components/CaseResolverNodeFileUtils';
import { getCaseResolverDocTooltip } from '@/features/case-resolver/relation-search/utils/docs';
import { FileTypeIcon, formatShortDate } from './document-relation-search-utils';

export interface DocumentTableColumnProps {
  isAllCases: boolean;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
  selectedFileIds: Set<string>;
  toggleFileSelection: (fileId: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  setPreviewFileId: (fileId: string | null) => void;
}

export const getDocumentTableColumns = ({
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
}: DocumentTableColumnProps): ColumnDef<NodeFileDocumentSearchRow>[] => {
  const columns: ColumnDef<NodeFileDocumentSearchRow>[] = [
    {
      id: 'select',
      header: (): React.JSX.Element => (
        <Checkbox
          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
          onCheckedChange={(checked) => {
            if (checked) selectAllVisible();
            else clearSelection();
          }}
          className='h-3.5 w-3.5'
          aria-label='Select all visible'
        />
      ),
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <Checkbox
          checked={selectedFileIds.has(row.original.file.id)}
          onCheckedChange={() => toggleFileSelection(row.original.file.id)}
          className='h-3.5 w-3.5'
          aria-label={`Select ${row.original.file.name}`}
        />
      ),
      size: 30,
    },
    {
      id: 'fileType',
      header: '',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <FileTypeIcon fileType={row.original.file.fileType} />
      ),
      size: 40,
    },
    {
      accessorKey: 'file.name',
      header: 'Name',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <Tooltip content={row.original.file.name} side='top'>
          <span
            className='block cursor-pointer truncate text-gray-200 hover:text-cyan-300 hover:underline'
            onClick={() => setPreviewFileId(row.original.file.id)}
          >
            {row.original.file.name}
          </span>
        </Tooltip>
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
      id: 'date',
      header: 'Date',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <span className='text-gray-400'>
          {formatShortDate(row.original.file.documentDate?.isoDate)}
        </span>
      ),
      size: 80,
    },
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
      id: 'locked',
      header: '',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element | null =>
        row.original.file.isLocked ? (
          <Tooltip content={getCaseResolverDocTooltip('lockedIndicator')} side='left'>
            <Lock className='size-3 text-amber-400/70' />
          </Tooltip>
        ) : null,
      size: 30,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: Row<NodeFileDocumentSearchRow> }): React.JSX.Element => (
        <Tooltip content={getCaseResolverDocTooltip('linkDocument')} side='left'>
          <button
            type='button'
            disabled={isLocked}
            className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40'
            onClick={(e) => {
              e.stopPropagation();
              onLinkFile(row.original.file.id);
            }}
          >
            <Plus className='size-3.5' />
          </button>
        </Tooltip>
      ),
      size: 40,
    }
  );

  return columns;
};
