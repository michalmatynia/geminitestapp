'use client';

import React from 'react';
import { Lock, Plus } from 'lucide-react';
import { Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import { getCaseResolverDocTooltip } from '../../utils/docs';
import { FileTypeIcon, formatShortDate } from './document-relation-search-utils';

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

  const colSpan = isAllCases ? 10 : 9;
  return (
    <Table className='text-xs'>
      <TableHeader className='sticky top-0 z-10 bg-card/90 backdrop-blur-sm'>
        <TableRow className='border-border/40 text-left text-gray-500 hover:bg-transparent'>
          <TableHead className='h-8 w-6 py-1 pl-3 pr-1'>
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
              onCheckedChange={(checked) => {
                if (checked) selectAllVisible();
                else clearSelection();
              }}
              className='h-3.5 w-3.5'
              aria-label='Select all visible'
            />
          </TableHead>
          <TableHead className='h-8 w-8 py-1 pl-1 pr-1 font-medium'></TableHead>
          <TableHead className='h-8 py-1 pr-2 font-medium'>Name</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Folder</TableHead>
          {isAllCases && (
            <TableHead className='h-8 px-2 py-1 font-medium'>Signature</TableHead>
          )}
          <TableHead className='h-8 px-2 py-1 font-medium'>Date</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>From</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>To</TableHead>
          <TableHead className='h-8 w-6 px-1 py-1 font-medium'></TableHead>
          <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className='border-border/20 hover:bg-transparent'>
            <TableCell colSpan={colSpan} className='h-20 py-3 text-center text-gray-500'>
              No documents found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.file.id}
              className='border-border/20 transition-colors hover:bg-card/50'
            >
              <TableCell className='h-9 w-6 py-1 pl-3 pr-1'>
                <Checkbox
                  checked={selectedFileIds.has(row.file.id)}
                  onCheckedChange={() => toggleFileSelection(row.file.id)}
                  className='h-3.5 w-3.5'
                  aria-label={`Select ${row.file.name}`}
                />
              </TableCell>

              <TableCell className='h-9 w-8 py-1 pl-1 pr-1'>
                <FileTypeIcon fileType={row.file.fileType} />
              </TableCell>

              <TableCell className='h-9 max-w-[160px] py-1 pr-2'>
                <Tooltip content={row.file.name} side='top'>
                  <span
                    className='block cursor-pointer truncate text-gray-200 hover:text-cyan-300 hover:underline'
                    onClick={() => setPreviewFileId(row.file.id)}
                  >
                    {row.file.name}
                  </span>
                </Tooltip>
              </TableCell>

              <TableCell className='h-9 max-w-[100px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.folderPath || '—'}
                >
                  {row.folderPath || '—'}
                </span>
              </TableCell>

              {isAllCases && (
                <TableCell className='h-9 max-w-[100px] px-2 py-1'>
                  <span
                    className='block truncate text-cyan-400/80'
                    title={row.signatureLabel || '—'}
                  >
                    {row.signatureLabel || '—'}
                  </span>
                </TableCell>
              )}

              <TableCell className='h-9 w-[68px] px-2 py-1'>
                <span className='text-gray-400'>
                  {formatShortDate(row.file.documentDate?.isoDate)}
                </span>
              </TableCell>

              <TableCell className='h-9 max-w-[80px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.addresserLabel || '—'}
                >
                  {row.addresserLabel || '—'}
                </span>
              </TableCell>

              <TableCell className='h-9 max-w-[80px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.addresseeLabel || '—'}
                >
                  {row.addresseeLabel || '—'}
                </span>
              </TableCell>

              <TableCell className='h-9 w-6 px-1 py-1'>
                {row.file.isLocked && (
                  <Tooltip content={getCaseResolverDocTooltip('lockedIndicator')} side='left'>
                    <Lock className='size-3 text-amber-400/70' />
                  </Tooltip>
                )}
              </TableCell>

              <TableCell className='h-9 py-1 pl-2 pr-3'>
                <Tooltip content={getCaseResolverDocTooltip('linkDocument')} side='left'>
                  <button
                    type='button'
                    disabled={isLocked}
                    className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40'
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkFile(row.file.id);
                    }}
                  >
                    <Plus className='size-3.5' />
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
