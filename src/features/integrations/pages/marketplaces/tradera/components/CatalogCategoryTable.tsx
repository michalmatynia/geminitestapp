'use client';

import { RefreshCw } from 'lucide-react';
import React from 'react';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives.public';

export interface CatalogCategoryTableActions {
  onFetch: (externalCategoryId: string) => Promise<void>;
  isFetching: boolean;
  fetchingCategoryId: string | null;
}

export interface CatalogCategoryTableProps {
  categories: {
    externalCategoryId: string;
    label: string;
    fieldCount: number;
    hasFetchedCatalog: boolean;
    latestFetchedAt: string | null;
    staleRuleCount: number;
  }[];
  actions: CatalogCategoryTableActions;
}

export function CatalogCategoryTable({
  categories,
  actions,
}: CatalogCategoryTableProps): React.JSX.Element {
  const { onFetch, isFetching, fetchingCategoryId } = actions;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Current Tradera Category</TableHead>
          <TableHead>Fetch Status</TableHead>
          <TableHead>Stale Rules</TableHead>
          <TableHead>Latest Fetch</TableHead>
          <TableHead className='w-[140px] text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.externalCategoryId}>
            <TableCell className='align-top'>{category.label}</TableCell>
            <TableCell className='align-top'>
              {!category.hasFetchedCatalog
                ? 'Not fetched yet'
                : category.fieldCount > 0
                ? `${category.fieldCount} field catalog${category.fieldCount === 1 ? '' : 's'} stored`
                : 'Fetched, no additional fields found'}
            </TableCell>
            <TableCell
              className={
                category.staleRuleCount > 0
                  ? 'align-top text-sm text-amber-600'
                  : 'align-top text-sm text-muted-foreground'
              }
            >
              {category.staleRuleCount > 0
                ? `${category.staleRuleCount} stale rule${
                    category.staleRuleCount === 1 ? '' : 's'
                  }`
                : 'No stale rules'}
            </TableCell>
            <TableCell className='align-top text-sm text-muted-foreground'>
              {category.latestFetchedAt
                ? new Date(category.latestFetchedAt).toLocaleString()
                : 'Not fetched yet'}
            </TableCell>
            <TableCell className='text-right align-top'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => void onFetch(category.externalCategoryId)}
                loading={
                  isFetching &&
                  fetchingCategoryId === category.externalCategoryId
                }
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                {category.hasFetchedCatalog ? 'Refetch' : 'Fetch'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
