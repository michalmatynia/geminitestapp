'use client';

import React from 'react';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';
import { useCategoryMapperPageContext } from '@/features/integrations/context/CategoryMapperPageContext';

import { BaseProducerMapper } from './BaseProducerMapper';
import { BaseTagMapper } from './BaseTagMapper';
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
        <CategoryMapperTable />
        <BaseProducerMapper />
        <BaseTagMapper />
      </div>
    </CategoryMapperProvider>
  );
}
