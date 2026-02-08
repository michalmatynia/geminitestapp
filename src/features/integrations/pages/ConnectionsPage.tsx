'use client';

import { Suspense } from 'react';

import { IntegrationList } from '@/features/integrations/components/connections/IntegrationList';
import { IntegrationModal } from '@/features/integrations/components/connections/IntegrationModal';
import { IntegrationsProvider, useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { integrationDefinitions } from '@/features/integrations/types/integrations-ui';
import { ConfirmDialog } from '@/shared/ui';

function IntegrationsContent(): React.JSX.Element {
  const {
    integrations,
    activeIntegration,
    isModalOpen,
    connectionToDelete,
    setConnectionToDelete,
    handleIntegrationClick,
    handleConfirmDeleteConnection,
  } = useIntegrationsContext();

  return (
    <div className='container mx-auto py-10'>
      <ConfirmDialog
        open={!!connectionToDelete}
        onOpenChange={(open: boolean) => !open && setConnectionToDelete(null)}
        onConfirm={(): void => { void handleConfirmDeleteConnection(); }}
        title='Delete Connection'
        description={`Are you sure you want to delete connection "${connectionToDelete?.name}"? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />
      <IntegrationList
        integrations={integrations}
        onIntegrationClick={(def: (typeof integrationDefinitions)[number]): void => { void handleIntegrationClick(def); }}
      />

      {isModalOpen && activeIntegration && (
        <IntegrationModal />
      )}
    </div>
  );
}

export default function IntegrationsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div>Loading integrations...</div>}>
      <IntegrationsProvider>
        <IntegrationsContent />
      </IntegrationsProvider>
    </Suspense>
  );
}