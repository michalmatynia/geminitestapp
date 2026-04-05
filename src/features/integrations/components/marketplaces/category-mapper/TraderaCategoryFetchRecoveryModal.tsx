import React from 'react';

import {
  useCategoryMapperActions,
  useCategoryMapperConfig,
  useCategoryMapperUIState,
} from '@/features/integrations/context/CategoryMapperContext';
import { AppModal } from '@/shared/ui/feedback.public';
import { Button } from '@/shared/ui/primitives.public';

export function TraderaCategoryFetchRecoveryModal(): React.JSX.Element | null {
  const { connectionName } = useCategoryMapperConfig();
  const {
    showTraderaLoginRecoveryModal,
    traderaLoginRecoveryReason,
    openingTraderaLoginRecovery,
  } = useCategoryMapperUIState();
  const { closeTraderaLoginRecoveryModal, handleOpenTraderaLoginRecovery } =
    useCategoryMapperActions();

  if (!showTraderaLoginRecoveryModal) {
    return null;
  }

  return (
    <AppModal
      isOpen
      onClose={closeTraderaLoginRecoveryModal}
      title='Tradera login required'
      subtitle={connectionName}
      size='sm'
      lockClose={openingTraderaLoginRecovery}
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            onClick={closeTraderaLoginRecoveryModal}
            disabled={openingTraderaLoginRecovery}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={(): void => {
              void handleOpenTraderaLoginRecovery();
            }}
            disabled={openingTraderaLoginRecovery}
          >
            {openingTraderaLoginRecovery ? 'Waiting for manual login...' : 'Login to Tradera'}
          </Button>
        </>
      }
    >
      <div className='space-y-3 text-sm text-muted-foreground'>
        <p>
          Tradera category fetch needs a valid logged-in browser session before categories can be
          scraped from the live listing page.
        </p>
        {traderaLoginRecoveryReason ? (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
            {traderaLoginRecoveryReason}
          </div>
        ) : null}
        <p className='text-xs text-muted-foreground/90'>
          Continue to the Tradera login window, complete any manual verification, and category
          fetch will retry automatically when the session is saved.
        </p>
      </div>
    </AppModal>
  );
}
