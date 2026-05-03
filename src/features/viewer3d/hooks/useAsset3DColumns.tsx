'use client';

import { Box } from 'lucide-react';
import React, { useMemo } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';

import { formatAssetDate } from '../utils/formatAssetDate';
import { formatFileSize } from '../components/Asset3DListSubcomponents';

import type { ColumnDef } from '@tanstack/react-table';

export function useAsset3DColumns(setPreviewAsset: (asset: Asset3DRecord) => void): ColumnDef<Asset3DRecord>[] {
  return useMemo<ColumnDef<Asset3DRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const name = row.original.name;
          const filename = row.original.filename ?? '';
          return (
            <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
              <div className='flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40'>
                <Box className='h-4 w-4 text-muted-foreground' />
              </div>
              <span className='text-sm font-medium text-foreground truncate'>
                {name !== '' ? name : filename}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) => {
          const catId = row.original.categoryId ?? '';
          return catId !== '' ? (
            <StatusBadge
              status={catId}
              variant='info'
              size='sm'
              className='font-medium'
            />
          ) : (
            <span className='text-muted-foreground'>-</span>
          );
        },
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          return (
            <div className='flex flex-wrap gap-1'>
              {tags.slice(0, 2).map((tag) => (
                <StatusBadge
                  key={tag}
                  status={tag}
                  variant='neutral'
                  size='sm'
                  className='font-medium'
                />
              ))}
              {tags.length > 2 && (
                <StatusBadge
                  status={`+${  tags.length - 2}`}
                  variant='neutral'
                  size='sm'
                  className='font-bold'
                />
              )}
              {tags.length === 0 && (
                <span className='text-muted-foreground'>-</span>
              )}
            </div>
          );
        },
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
        cell: ({ row }) => {
          const createdAt = row.original.createdAt ?? '';
          return (
            <span className='text-xs text-muted-foreground'>
              {createdAt !== '' ? formatAssetDate(createdAt) : ''}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Action</div>,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button variant='outline' size='xs' onClick={() => setPreviewAsset(row.original)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [setPreviewAsset]
  );
}
