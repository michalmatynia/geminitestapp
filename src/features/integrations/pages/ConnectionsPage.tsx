'use client';

import { Suspense } from 'react';

import { IntegrationList } from '@/features/integrations/components/connections/IntegrationList';
import { IntegrationModal } from '@/features/integrations/components/connections/IntegrationModal';
import { IntegrationsProvider, useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { ConfirmDialog } from '@/shared/ui';

function IntegrationsContent(): React.JSX.Element {
  const {
    activeIntegration,
    isModalOpen,
    connectionToDelete,
    setConnectionToDelete,
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
      <IntegrationList />

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
