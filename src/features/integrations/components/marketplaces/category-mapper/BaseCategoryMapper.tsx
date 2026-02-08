'use client';

import React from 'react';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';

import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';
import { CategoryMapperHeader } from './CategoryMapperHeader';
import { CategoryMapperStats } from './CategoryMapperStats';
import { CategoryMapperTable } from './CategoryMapperTable';

type BaseCategoryMapperProps = {
  connectionId: string;
  connectionName: string;
};

export function BaseCategoryMapper({ connectionId, connectionName }: BaseCategoryMapperProps): React.JSX.Element {
  return (
    <CategoryMapperProvider connectionId={connectionId} connectionName={connectionName}>
      <div className='space-y-6'>
        <CategoryMapperHeader />
        <CategoryMapperCatalogSelector />
        <CategoryMapperStats />
        <CategoryMapperTable />
      </div>
    </CategoryMapperProvider>
  );
}