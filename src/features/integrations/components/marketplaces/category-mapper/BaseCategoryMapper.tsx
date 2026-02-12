'use client';

import React from 'react';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';
import { useCategoryMapperPageContext } from '@/features/integrations/context/CategoryMapperPageContext';

import { BaseProducerMapper } from './BaseProducerMapper';
import { BaseTagMapper } from './BaseTagMapper';
import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';
import { CategoryMapperHeader } from './CategoryMapperHeader';
import { CategoryMapperStats } from './CategoryMapperStats';
import { CategoryMapperTable } from './CategoryMapperTable';

export function BaseCategoryMapper(): React.JSX.Element {
  const { selectedConnection } = useCategoryMapperPageContext();
  if (!selectedConnection) {
    return <></>;
  }

  return (
    <CategoryMapperProvider
      connectionId={selectedConnection.id}
      connectionName={selectedConnection.name}
    >
      <div className='space-y-6'>
        <CategoryMapperHeader />
        <CategoryMapperCatalogSelector />
        <CategoryMapperStats />
        <CategoryMapperTable />
        <BaseProducerMapper />
        <BaseTagMapper />
      </div>
    </CategoryMapperProvider>
  );
}
