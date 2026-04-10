'use client';

import { RefreshCw } from 'lucide-react';
import React from 'react';

import type { TraderaParameterMapperCatalogEntry } from '@/shared/contracts/integrations/tradera-parameter-mapper';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives.public';
import { buildCategoryOptionLabel } from './tradera-mapping-utils';

export interface CatalogEntriesTableProps {
  entries: TraderaParameterMapperCatalogEntry[];
  onRefetch: (externalCategoryId: string) => Promise<void>;
  isRefetching: boolean;
  refetchingCategoryId: string | null;
}

export function CatalogEntriesTable({
  entries,
  onRefetch,
  isRefetching,
  refetchingCategoryId,
}: CatalogEntriesTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tradera Category</TableHead>
          <TableHead>Field</TableHead>
          <TableHead>Available Options</TableHead>
          <TableHead>Fetched</TableHead>
          <TableHead className='w-[140px] text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className='align-top'>
              {buildCategoryOptionLabel(entry)}
            </TableCell>
            <TableCell className='align-top'>{entry.fieldLabel}</TableCell>
            <TableCell className='align-top'>
              <div className='line-clamp-3 text-sm'>
                {entry.optionLabels.length > 0
                  ? entry.optionLabels.join(', ')
                  : 'No visible options detected'}
              </div>
            </TableCell>
            <TableCell className='align-top text-sm text-muted-foreground'>
              {new Date(entry.fetchedAt).toLocaleString()}
            </TableCell>
            <TableCell className='text-right align-top'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => void onRefetch(entry.externalCategoryId)}
                loading={
                  isRefetching &&
                  refetchingCategoryId === entry.externalCategoryId
                }
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Refetch
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
