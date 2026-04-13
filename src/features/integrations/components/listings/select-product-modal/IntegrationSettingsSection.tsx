'use client';

import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import { Alert } from '@/shared/ui/primitives.public';

import { ConnectedIntegrationFieldsSection } from '../ConnectedIntegrationFieldsSection';
import { IntegrationSpecificListingSettings } from '../IntegrationSpecificListingSettings';
import { resolveSelectProductIntegrationSettingsCopy } from '../product-listings-copy';
import { useSelectProductForListingModalContext } from './context/SelectProductForListingModalContext';

export function IntegrationSettingsSection(): React.JSX.Element {
  const { isBaseComIntegration } = useListingSelection();
  const { error } = useSelectProductForListingModalContext();
  const { sectionTitle } = resolveSelectProductIntegrationSettingsCopy();

  return (
    <div className='space-y-4'>
      <ConnectedIntegrationFieldsSection
        title={sectionTitle}
        variant='subtle'
        className='p-4 space-y-4'
        strategy='select'
        loadingVariant='loading-state'
        loadingSize='sm'
        loadingClassName='py-4'
        footer={
          isBaseComIntegration ? (
            <IntegrationSpecificListingSettings includeTradera={false} />
          ) : null
        }
      />

      {error && <Alert variant='error'>{error}</Alert>}
    </div>
  );
}
