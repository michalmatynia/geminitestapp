'use client';

import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { ExternalCategory } from '@/features/integrations/types/category-mapping';

import { CategoryMapperRow } from './CategoryMapperRow';

export function CategoryMapperTable(): React.JSX.Element {
  const {
    externalCategoriesLoading,
    mappingsLoading,
    externalCategories,
    categoryTree,
  } = useCategoryMapper();

  return (
    <div className='overflow-hidden rounded-md border border-border'>
      <table className='w-full'>
        <thead>
          <tr className='border-b border-border bg-card/50'>
            <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
              External Category
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
              Internal Category
            </th>
          </tr>
        </thead>
        <tbody>
          {externalCategoriesLoading || mappingsLoading ? (
            <tr>
              <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                Loading categories...
              </td>
            </tr>
          ) : externalCategories.length === 0 ? (
            <tr>
              <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                No external categories found. Click &quot;Fetch Categories&quot; to load from Base.com.
              </td>
            </tr>
          ) : (
            categoryTree.map((category: ExternalCategory) => (
              <CategoryMapperRow key={category.id} category={category} depth={0} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
