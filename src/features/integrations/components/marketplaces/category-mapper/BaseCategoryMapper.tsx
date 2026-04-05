import React from 'react';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';
import { useCategoryMapperPageSelection } from '@/features/integrations/context/CategoryMapperPageContext';

import { BaseProducerMapper } from './BaseProducerMapper';
import { BaseTagMapper } from './BaseTagMapper';
import { CategoryMapperTable } from './CategoryMapperTable';
import { TraderaCategoryFetchRecoveryModal } from './TraderaCategoryFetchRecoveryModal';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

export function BaseCategoryMapper(): React.JSX.Element {
  const { selectedConnection } = useCategoryMapperPageSelection();
  if (!selectedConnection) {
    return <></>;
  }

  const isBaseConnection = BASE_MARKETPLACE_SLUGS.has(
    selectedConnection.integration.slug.toLowerCase()
  );

  return (
    <CategoryMapperProvider
      connectionId={selectedConnection.id}
      connectionName={selectedConnection.name}
      integrationId={selectedConnection.integration.id}
      integrationSlug={selectedConnection.integration.slug}
    >
      <div className='space-y-6'>
        <CategoryMapperTable />
        <TraderaCategoryFetchRecoveryModal />
        {isBaseConnection ? <BaseProducerMapper /> : null}
        {isBaseConnection ? <BaseTagMapper /> : null}
      </div>
    </CategoryMapperProvider>
  );
}
