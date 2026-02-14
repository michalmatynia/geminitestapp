'use client';

import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { ExternalCategory } from '@/features/integrations/types/category-mapping';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';

import { CategoryMapperRow } from './CategoryMapperRow';
import { CategoryMapperRowDepthProvider } from './CategoryMapperRowDepthContext';

export function CategoryMapperTable(): React.JSX.Element {
  const {
    externalCategoriesLoading,
    mappingsLoading,
    externalCategories,
    categoryTree,
  } = useCategoryMapper();

  return (
    <div className='rounded-md border border-border overflow-hidden'>
      <div className='max-h-[60vh] overflow-auto'>
        <Table className='border-separate border-spacing-0'>
          <TableHeader className='sticky top-0 z-10 bg-background'>
            <TableRow className='bg-card/50'>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400 border-b border-border'>
                External Category
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400 border-b border-border'>
                Internal Category
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {externalCategoriesLoading || mappingsLoading ? (
              <TableRow>
                <TableCell colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : externalCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  No external categories found. Click &quot;Fetch Categories&quot; to load from Base.com.
                </TableCell>
              </TableRow>
            ) : (
              categoryTree.map((category: ExternalCategory) => (
                <CategoryMapperRowDepthProvider key={category.id} depth={0}>
                  <CategoryMapperRow category={category} />
                </CategoryMapperRowDepthProvider>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
