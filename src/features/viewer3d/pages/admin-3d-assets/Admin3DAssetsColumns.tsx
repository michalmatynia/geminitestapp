'use client';

import { Box } from 'lucide-react';
import React, { useMemo } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';

import { formatAssetDate } from '../../utils/formatAssetDate';

import type { ColumnDef } from '@tanstack/react-table';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function useAdmin3DAssetsColumns({
  setPreviewAsset,
  setEditAsset,
  handleDelete,
  isDeleting,
}: {
  setPreviewAsset: (asset: Asset3DRecord) => void;
  setEditAsset: (asset: Asset3DRecord) => void;
  handleDelete: (asset: Asset3DRecord) => void;
  isDeleting: (id: string) => boolean;
}) {
  return useMemo<ColumnDef<Asset3DRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
            const name = row.original.name !== '' ? row.original.name : row.original.filename;
            return (
          <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
            <button
              type='button'
              className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-muted/40 hover:bg-muted/60 transition-colors'
              onClick={() => setPreviewAsset(row.original)}
              aria-label={`Preview ${name}`}
              title={`Preview ${name}`}>
              <Box className='h-4 w-4 text-muted-foreground' />
            </button>
            <span className='text-sm font-medium text-foreground truncate'>
              {name}
            </span>
          </div>
        );
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) =>
          row.original.categoryId !== '' && row.original.categoryId !== null ? (
            <StatusBadge
              status={row.original.categoryId}
              variant='info'
              size='sm'
              className='font-medium'
            />
          ) : (
            <span className='text-muted-foreground'>-</span>
          ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {(row.original.tags ?? []).slice(0, 2).map((tag) => (
              <StatusBadge
                key={tag}
                status={tag}
                variant='neutral'
                size='sm'
                className='font-medium'
              />
            ))}
            {(row.original.tags ?? []).length > 2 && (
              <StatusBadge
                status={`+${  (row.original.tags ?? []).length - 2}`}
                variant='neutral'
                size='sm'
                className='font-bold'
              />
            )}
            {(row.original.tags ?? []).length === 0 && (
              <span className='text-muted-foreground'>-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className='text-xs text-muted-foreground'>
            {formatFileSize(row.original.size ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className='text-xs text-muted-foreground'>
            {row.original.createdAt !== '' ? formatAssetDate(row.original.createdAt) : ''}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
            const name = row.original.name !== '' ? row.original.name : row.original.filename;
            return (
          <div className='flex justify-end'>
            <ActionMenu
              ariaLabel={`Actions for asset ${name}`}
            >
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setPreviewAsset(row.original);
                }}
              >
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setEditAsset(row.original);
                }}
              >
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  void handleDelete(row.original);
                }}
                disabled={isDeleting(row.original.id)}
              >
                {isDeleting(row.original.id) ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        );
        },
      },
    ],
    [setPreviewAsset, setEditAsset, handleDelete, isDeleting]
  );
}
